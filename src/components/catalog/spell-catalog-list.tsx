import React, {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  SectionList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Button, Text } from 'react-native-paper';

import CatalogCustomRow from '@/components/catalog-custom-row';
import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import SpellFilterPanel from '@/components/spell-catalog-filters';
import SpellDetail from '@/components/spell-detail';
import AppFab from '@/components/ui/app-fab';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-card';
import { DISCIPLINE_LABEL, dragonMageLabel, SPHERES } from '@/constants/prophecy';
import { SPELL_CATALOG, type SpellPreset } from '@/data/spell-catalog';
import type { SpellReadings } from '@/hooks/use-spell-total';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SpellTotal } from '@/lib/spell-total';
import {
  activeFilterCount,
  buildSpellSections,
  compareSpellEntries,
  NO_FILTERS,
  type SpellFilterCriteria,
  type SpellSection,
} from '@/lib/spell-catalog-filter';
import { foldQuery } from '@/lib/text-fold';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * Search index, built once at module load: folding 300+ names on every keystroke
 * is pure garbage, and `discipline`/`sphere` are optional on a preset (the
 * columns have DB defaults) so the fallbacks are resolved here too.
 *
 * Sorted here as well — niveau ascending then name — because the order is a
 * property of the catalogue, not of a keystroke: filtering preserves it for
 * free instead of re-sorting every section on every render.
 */
const INDEX = SPELL_CATALOG.map((preset) => ({
  preset,
  search: foldQuery(preset.data.name ?? ''),
  sortKey: (preset.data.name ?? '').toLowerCase(),
  discipline: preset.data.discipline ?? 'sorcellerie',
  sphere: preset.data.sphere ?? 'sphereFeu',
  level: String(preset.data.level ?? ''),
  tags: preset.data.tags ?? [],
})).sort(compareSpellEntries);
type Entry = (typeof INDEX)[number];

// Levels present in the catalogue, read from the data so a new niveau in the CSV
// shows up without touching this screen. Roman numerals — that is how the
// rulebook writes a spell's niveau, and they keep the chips one glyph wide.
const LEVEL_OPTIONS = [
  { key: '', label: 'Tous' },
  ...[...new Set(INDEX.map((e) => e.level).filter(Boolean))]
    .sort()
    .map((l) => ({ key: l, label: ROMAN[Number(l) - 1] ?? l })),
];

const NONE_COLLAPSED: ReadonlySet<string> = new Set();
const NONE_OWNED: ReadonlySet<string> = new Set();

// Hoisted: a fresh array or arrow on every render is a changed prop to the
// VirtualizedList, which is exactly what it warns about.
const keyExtractor = (e: { preset: { id: string } }) => e.preset.id;

/**
 * The spell catalogue itself — filters, sections and rows, with no idea whose
 * it is. Presets live in {@link SPELL_CATALOG}.
 *
 * Grouped by **sphère** — the axis a player shops along — and narrowed by name
 * search plus sphère/discipline/niveau/tag facets. Unlike the weapon catalogue
 * this one is a `SectionList`: 300+ spells, so rendering them all up front
 * stalled the modal's opening transition. Only the visible rows mount.
 *
 * Two things make that length navigable:
 * - each sphère **folds**, filtered or not. Its header always carries the match
 *   count, so a fold hides rows but never the fact that they exist — which is
 *   what makes folding safe to keep while a search is running;
 * - a **FAB appears once the header has scrolled off** and reopens the very same
 *   filter panel in a dialog, so the search is one tap away from row 300 —
 *   and its primary action doubles as the « done » that closes it again.
 *
 * Filtering stays **live**: the dialog narrows the list as chips are tapped, so
 * its primary button confirms rather than applies — which is why it is labelled
 * with the count it is about to reveal.
 *
 * Every prop is optional: see {@link WeaponCatalogList} for why the picker and
 * the character-free reference are the same list. With no `readings` a row
 * drops its « Total » and the détail prints the durée symbolically — « Sphère
 * tours » rather than a number nobody can compute yet.
 */
export default function SpellCatalogList({
  readings,
  owned = NONE_OWNED,
  onAdd,
}: {
  /** Casting score and stat values for this character's sheet. */
  readings?: SpellReadings;
  /** Preset ids already in the spellbook — flagged « Déjà ajouté », never hidden. */
  owned?: ReadonlySet<string>;
  /** Called with a preset, or with nothing for « Sortilège personnalisé ». */
  onAdd?: (preset?: SpellPreset) => void;
}) {
  const theme = useProphecyTheme();

  // One object rather than four states: its identity only changes when the
  // player actually types or taps, so `useDeferredValue` and the memo below
  // still hit on every unrelated render.
  const [criteria, setCriteria] = useState<SpellFilterCriteria>(NO_FILTERS);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(NONE_COLLAPSED);
  // The header has scrolled off; the FAB stands in for it.
  const [stuck, setStuck] = useState(false);
  const [filterDialog, setFilterDialog] = useState(false);
  // Lets a row's « Replier » put itself back at the top of the screen.
  const { scrollRef, onScroll: trackScroll, value: catalogScroll } = useCatalogScrollHost();

  // Re-sectioning the catalogue is the expensive half of a keystroke; deferring
  // it keeps the Searchbar and the chips responsive while the list catches up.
  const applied = useDeferredValue(criteria);

  const sections = useMemo(
    () => buildSpellSections(INDEX, SPHERES, applied, collapsed),
    [applied, collapsed],
  );

  /**
   * Every preset's casting score, computed once per character change instead of
   * once per row per render. `React.memo` on the row compares by identity, so a
   * freshly built `{ total: 8, … }` per render defeated it outright and every
   * keystroke re-rendered the whole mounted window.
   *
   * Empty with no character: there is no sheet to score against, and a map of
   * zeroes would read as a real (terrible) total rather than as « unknown ».
   */
  const totalFor = readings?.totalFor;
  const totals = useMemo(() => {
    const m = new Map<string, SpellTotal>();
    if (!totalFor) return m;
    for (const e of INDEX) {
      m.set(
        e.preset.id,
        totalFor({
          discipline: e.discipline,
          sphere: e.sphere,
          cleParfaite: e.preset.data.cleParfaite,
        }),
      );
    }
    return m;
  }, [totalFor]);

  const resultCount = useMemo(() => sections.reduce((n, s) => n + s.count, 0), [sections]);
  const filterCount = activeFilterCount(criteria);
  // Counted off the APPLIED criteria, so the button never promises a number the
  // list behind it is not showing yet.
  const resultLabel =
    resultCount === 0
      ? 'Aucun résultat'
      : resultCount === 1
        ? 'Voir 1 résultat'
        : `Voir ${resultCount} résultats`;

  const toggleSphere = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // The offset the summary bar takes over at, measured rather than guessed: the
  // header's height depends on how far the facet row wrapped.
  const headerHeight = useRef(0);
  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    headerHeight.current = e.nativeEvent.layout.height;
  }, []);
  // Only the CROSSING is state — setting the raw offset would re-render the
  // whole list on every frame of a scroll. `trackScroll` keeps the raw offset
  // in a ref for the same reason; a row's « Replier » reads it once.
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      trackScroll(e);
      const past = e.nativeEvent.contentOffset.y > headerHeight.current;
      setStuck((s) => (s === past ? s : past));
    },
    [trackScroll],
  );

  const caracValue = readings?.caracValue;
  const renderItem = useCallback(
    ({ item }: { item: Entry }) => (
      <SpellRow
        entry={item}
        total={totals.get(item.preset.id)}
        caracValue={caracValue}
        owned={owned.has(item.preset.id)}
        onAdd={onAdd}
      />
    ),
    [onAdd, totals, caracValue, owned],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SpellSection<Entry> }) => (
      <View style={styles.sectionHeader}>
        <SectionHeader
          title={section.title}
          icon="magic"
          helper={String(section.count)}
          expanded={!collapsed.has(section.key)}
          onPress={() => toggleSphere(section.key)}
        />
      </View>
    ),
    [collapsed, toggleSphere],
  );

  const filterPanel = (props?: Partial<ComponentProps<typeof SpellFilterPanel>>) => (
    <SpellFilterPanel
      criteria={criteria}
      onChange={setCriteria}
      levelOptions={LEVEL_OPTIONS}
      {...props}
    />
  );

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <SectionList
        ref={scrollRef}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        // Rows are cheap but numerous, and they can't be measured ahead
        // (expanding one shows the whole rulebook entry), so no getItemLayout —
        // a smaller window and smaller batches are what keep a fling smooth.
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        // The headers are transparent (a title + a hairline rule), so pinning one
        // over scrolling rows would just overlap them.
        stickySectionHeadersEnabled={false}
        // A tap must reach the row on the first press even with the search
        // keyboard up, instead of being eaten by the dismiss.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={CONTAINER_STYLE}
        ListHeaderComponent={
          // An element, not a component: an inline component type would remount
          // on every render and the Searchbar would lose focus mid-word.
          <View style={styles.header} onLayout={onHeaderLayout}>
            {filterPanel()}
            {onAdd ? (
              <CatalogCustomRow label="Sortilège personnalisé" onPress={() => onAdd()} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            Aucun sortilège ne correspond.
          </Text>
        }
      />

      {/* Only once the real header is gone: while it is on screen the FAB would
          just cover the rows it duplicates. */}
      {stuck ? (
        <AppFab
          icon={dsIcon('filter')}
          label={filterCount > 0 ? `Filtres (${filterCount})` : 'Filtres'}
          onPress={() => setFilterDialog(true)}
        />
      ) : null}

      <DsDialog
        visible={filterDialog}
        onDismiss={() => setFilterDialog(false)}
        title="Filtrer les sortilèges"
        dismiss={
          <Button disabled={filterCount === 0} onPress={() => setCriteria(NO_FILTERS)}>
            Réinitialiser
          </Button>
        }
        // Not « Appliquer » — the list narrowed as the chips were tapped. Naming
        // the count is what makes closing the dialog feel like the result of the
        // filtering rather than a separate step.
        actions={
          <Button mode="contained" icon={dsIcon('check')} onPress={() => setFilterDialog(false)}>
            {resultLabel}
          </Button>
        }>
        {filterPanel({ autoFocus: true })}
      </DsDialog>
    </CatalogScrollProvider>
  );
}

/**
 * One catalogue row. Memoized: scrolling re-renders the list, not every row that
 * happens to still be mounted.
 */
const SpellRow = React.memo(function SpellRow({
  entry,
  total,
  caracValue,
  owned,
  onAdd,
}: {
  entry: Entry;
  /** Absent with no character in context — the row then shows no « Total ». */
  total?: SpellTotal;
  caracValue?: (caracKey: string) => number;
  /** Already in this character's spellbook — flagged, never hidden or blocked. */
  owned: boolean;
  onAdd?: (preset: SpellPreset) => void;
}) {
  const { preset: p } = entry;
  // The sphère is the section title, so the row names its discipline instead.
  const sub = [
    p.data.level ? `Niv. ${p.data.level}` : null,
    DISCIPLINE_LABEL[entry.discipline],
    // Whether the sphère alone is enough decides the pick, so it belongs on the
    // row and not only in the preview below it.
    p.data.dragonOnly ? dragonMageLabel(entry.sphere) : null,
    `Diff. ${p.data.difficulty}`,
    total ? `Total ${total.total}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <CatalogRow
      icon="magic"
      name={p.data.name ?? ''}
      subtitle={sub}
      badge={owned ? 'Déjà ajouté' : undefined}
      addLabel={`Ajouter ${p.data.name}`}
      onAdd={onAdd && (() => onAdd(p))}>
      {/* The preset's discipline/sphère fall back the same way the index does,
          so the preview's total matches the row's. */}
      <SpellDetail
        spell={{ ...p.data, discipline: entry.discipline, sphere: entry.sphere }}
        total={total}
        caracValue={caracValue}
      />
    </CatalogRow>
  );
});

const styles = StyleSheet.create({
  // Bottom padding clears the FAB, so the last sortilège is still addable.
  container: { padding: 16, paddingBottom: 96 },
  header: { gap: 16, marginBottom: 16 },
  sectionHeader: { paddingTop: 16, paddingBottom: 10 },
  empty: { textAlign: 'center', marginTop: 8 },
});

// Declared after `styles`, and once: an inline array literal would be a new
// prop identity on every render of the list.
const CONTAINER_STYLE = [styles.container, contentWidth];
