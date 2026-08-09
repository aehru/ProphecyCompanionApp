import { useRouter } from 'expo-router';
import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';

import ChipSelect from '@/components/ui/chip-select';
import Icon from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-card';
import SelectField from '@/components/ui/select-field';
import { DISCIPLINE_LABEL, DISCIPLINES, SPHERES } from '@/constants/prophecy';
import { SPELL_CATALOG, type SpellPreset } from '@/data/spell-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useSpellTotal } from '@/hooks/use-spell-total';
import { createSpell } from '@/repositories/spells';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * Search index, built once at module load: lowercasing 136 names on every
 * keystroke is pure garbage, and `discipline`/`sphere` are optional on a preset
 * (the columns have DB defaults) so the fallbacks are resolved here too.
 */
const INDEX = SPELL_CATALOG.map((preset) => ({
  preset,
  search: (preset.data.name ?? '').toLowerCase(),
  discipline: preset.data.discipline ?? 'sorcellerie',
  sphere: preset.data.sphere ?? 'sphereFeu',
  level: String(preset.data.level ?? ''),
}));
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

const DISCIPLINE_OPTIONS = [
  { key: '', label: 'Toutes' },
  ...DISCIPLINES.map((d) => ({ key: d.key, label: d.abbr })),
];

const SPHERE_OPTIONS = [{ key: '', label: 'Toutes' }, ...SPHERES];

/**
 * Spell catalogue picker (modal). Select a preset to add it and jump into its
 * editor, or start from a blank custom spell. Presets live in {@link SPELL_CATALOG}.
 *
 * Grouped by **sphère** — the axis a player shops along — and narrowed by name
 * search plus sphère/discipline/niveau facets. Unlike the weapon catalogue this
 * one is a `SectionList`: 136 spells and growing, so rendering them all up front
 * stalled the modal's opening transition. Only the visible rows mount.
 */
export default function SpellCatalogModal() {
  const numId = useCharacterId();
  const router = useRouter();
  const theme = useProphecyTheme();
  // Same score the Magie tab shows — a player picking a spell wants to know
  // what they would cast it at BEFORE adding it.
  const spellTotalFor = useSpellTotal(numId);

  const [query, setQuery] = useState('');
  // Facets, '' = no filter. 136 spells across 9 spheres / 3 disciplines / 3
  // levels, so name search alone is not enough to find "the level 1 Feu one".
  const [sphere, setSphere] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [level, setLevel] = useState('');

  // Re-sectioning the catalogue is the expensive half of a keystroke; deferring
  // it keeps the Searchbar and the chips responsive while the list catches up.
  // Deferred one value at a time, on purpose: a `{ ...criteria }` object would
  // get a new identity every render and the memo below would never hit.
  const q = useDeferredValue(query.trim().toLowerCase());
  const sphereFilter = useDeferredValue(sphere);
  const disciplineFilter = useDeferredValue(discipline);
  const levelFilter = useDeferredValue(level);

  const sections = useMemo(() => {
    const match = (e: Entry) =>
      (q === '' || e.search.includes(q)) &&
      (disciplineFilter === '' || e.discipline === disciplineFilter) &&
      (levelFilter === '' || e.level === levelFilter);

    return SPHERES.filter((s) => sphereFilter === '' || s.key === sphereFilter)
      .map((s) => ({
        key: s.key,
        title: s.label,
        data: INDEX.filter((e) => e.sphere === s.key && match(e)),
      }))
      .filter((s) => s.data.length > 0);
  }, [q, sphereFilter, disciplineFilter, levelFilter]);

  // Add the spell, then replace this screen with its editor so "back" from the
  // editor returns to the Magie tab (not the catalogue).
  const add = useCallback(
    async (preset?: SpellPreset) => {
      const row = await createSpell(numId, preset?.data);
      router.replace(`/character/${numId}/spell/${row.id}`);
    },
    [numId, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Entry }) => (
      <SpellRow
        entry={item}
        total={
          spellTotalFor({
            discipline: item.discipline,
            sphere: item.sphere,
            cleParfaite: item.preset.data.cleParfaite,
          }).total
        }
        onPress={add}
      />
    ),
    [add, spellTotalFor],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(e) => e.preset.id}
      renderItem={renderItem}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <SectionHeader title={section.title} icon="magic" />
        </View>
      )}
      // The headers are transparent (a title + a hairline rule), so pinning one
      // over scrolling rows would just overlap them.
      stickySectionHeadersEnabled={false}
      // A tap must add the spell on the first press even with the search
      // keyboard up, instead of being eaten by the dismiss.
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[styles.container, contentWidth]}
      ListHeaderComponent={
        // An element, not a component: an inline component type would remount
        // on every render and the Searchbar would lose focus mid-word.
        <View style={styles.header}>
          <Searchbar
            placeholder="Rechercher un sortilège"
            value={query}
            onChangeText={setQuery}
            icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
          />

          {/* Discipline and niveau are few and short — chips, visible at a
              glance. The 9 spheres would be a wall of them, so that one stays a
              dropdown (and doubles as a jump to one section). */}
          <View style={styles.filters}>
            <SelectField
              label="Sphère"
              options={SPHERE_OPTIONS}
              value={sphere}
              onChange={setSphere}
              style={styles.sphereFilter}
            />
            <View style={styles.disciplineFilter}>
              <ChipSelect
                label="Discipline"
                options={DISCIPLINE_OPTIONS}
                value={discipline}
                onChange={setDiscipline}
              />
            </View>
            <View style={styles.levelFilter}>
              <ChipSelect label="Niveau" options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
            </View>
          </View>

          <Pressable
            onPress={() => add()}
            style={[styles.row, { borderBottomColor: theme.prophecy.borderSoft }]}>
            <View
              style={[
                styles.tile,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
              ]}>
              <Icon name="plus" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.main}>
              <Text style={styles.name}>Sortilège personnalisé</Text>
              <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
                Partir de zéro
              </Text>
            </View>
            <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          Aucun sortilège ne correspond.
        </Text>
      }
    />
  );
}

/**
 * One catalogue row. Memoized: scrolling re-renders the list, not every row that
 * happens to still be mounted.
 */
const SpellRow = React.memo(function SpellRow({
  entry,
  total,
  onPress,
}: {
  entry: Entry;
  total: number;
  onPress: (preset: SpellPreset) => void;
}) {
  const theme = useProphecyTheme();
  const { preset: p } = entry;
  // The sphère is the section title, so the row names its discipline instead.
  const sub = [
    p.data.level ? `Niv. ${p.data.level}` : null,
    DISCIPLINE_LABEL[entry.discipline],
    `Diff. ${p.data.difficulty}`,
    `Total ${total}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onPress(p)}
      style={[styles.row, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <View
        style={[
          styles.tile,
          { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft },
        ]}>
        <Icon name="magic" size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {p.data.name}
        </Text>
        <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  header: { gap: 16, marginBottom: 16 },
  // Wraps to one column on a phone, sits on one line once there is room.
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  sphereFilter: { flexGrow: 1, flexBasis: 140, minWidth: 140 },
  disciplineFilter: { flexGrow: 2, flexBasis: 220, minWidth: 200 },
  levelFilter: { flexGrow: 1, flexBasis: 130, minWidth: 130 },
  sectionHeader: { paddingTop: 16, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10, borderBottomWidth: 1 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 1 },
  empty: { textAlign: 'center', marginTop: 8 },
});
