import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import CatalogCustomRow from '@/components/catalog-custom-row';
import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import TraitDetail from '@/components/trait-detail';
import { TRAIT_ICON } from '@/components/trait-icon';
import TraitPoolBar from '@/components/trait-pool-bar';
import ChipSelect from '@/components/ui/chip-select';
import Icon from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-card';
import {
  TRAIT_KIND_RARITIES,
  TRAIT_KINDS,
  TRAIT_RARITY_LABEL,
  type TraitKind,
} from '@/constants/prophecy';
import { TRAIT_CATALOG, type TraitPreset } from '@/data/trait-catalog';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { foldQuery } from '@/lib/text-fold';
import { buildTraitIndex, groupTraits } from '@/lib/trait-grouping';
import { traitOwnedBadge, traitUnaffordable, type TraitPool } from '@/lib/trait-pool';

// Folded and pre-rendered once at module load: the catalogue is static, and
// re-deriving it per keystroke is the cost lib/trait-grouping exists to remove.
const INDEX = buildTraitIndex(TRAIT_CATALOG);

// Hoisted: a fresh array on every render is a changed prop to <ChipSelect>.
const KIND_OPTIONS = TRAIT_KINDS.map((k) => ({ key: k.key, label: k.plural }));
const CUSTOM_LABEL: Record<TraitKind, string> = {
  avantage: 'Avantage personnalisé',
  desavantage: 'Désavantage personnalisé',
};
const EMPTY_KIND: Record<TraitKind, string> = {
  avantage: 'Les avantages du livre de règles ne sont pas encore saisis.',
  desavantage: 'Les désavantages du livre de règles ne sont pas encore saisis.',
};

/**
 * The rareté chips, per kind — « Rare » exists on one side only, so the filter
 * cannot be one shared list. Built once: the headings are a constant.
 */
const RARITY_OPTIONS: Record<TraitKind, { key: string; label: string }[]> = {
  avantage: [
    { key: '', label: 'Toutes' },
    ...TRAIT_KIND_RARITIES.avantage.map((r) => ({ key: r, label: TRAIT_RARITY_LABEL[r] })),
  ],
  desavantage: [
    { key: '', label: 'Toutes' },
    ...TRAIT_KIND_RARITIES.desavantage.map((r) => ({ key: r, label: TRAIT_RARITY_LABEL[r] })),
  ],
};

const NONE_COLLAPSED: ReadonlySet<string> = new Set();

/**
 * The avantages / désavantages catalogue — search, a kind switch, and rows
 * grouped by the rulebook's own availability headings.
 *
 * The kind switch is a SWITCH and not two sections: the two halves are read at
 * different moments (points are earned first, then spent), and the rarity
 * groups repeat on both sides, so showing them together would stack eight
 * headings on one screen.
 *
 * `onAdd` and `pool` are optional for the same reason as the other catalogues'
 * `readings`: the same list is a pure reference when no character is picking
 * from it, and then it shows no balance and flags nothing — a point total would
 * belong to a character who is not here.
 */
export default function TraitCatalogList({
  owned,
  pool,
  onAdd,
  onAddCustom,
}: {
  /**
   * How many times each preset is already on this character's sheet — badged
   * « Déjà ajouté », or « Déjà ajouté ×2 » for the entries the rulebook lets a
   * character take more than once.
   */
  owned?: Map<string, number>;
  /** This character's point balance. Omitted when browsing without one. */
  pool?: TraitPool;
  /** Take a catalogue entry. Omitted when the list is pure reference. */
  onAdd?: (preset: TraitPreset) => void;
  /**
   * Start a hand-written entry. Takes the kind because the list owns the
   * switch: a blank row created from the Avantages half must not land on the
   * other side of the pool.
   */
  onAddCustom?: (kind: TraitKind) => void;
}) {
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<TraitKind>('desavantage');
  const [rarity, setRarity] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(NONE_COLLAPSED);
  // Lets a row's « Replier » put itself back at the top of the screen.
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  // Switching side clears the rareté: « Rare » is a désavantage heading, and
  // carrying it over would leave the Avantages half filtered on something it
  // cannot have — an empty list with no visible cause.
  const switchKind = useCallback((next: string) => {
    setKind(next as TraitKind);
    setRarity('');
  }, []);

  const toggleRarity = useCallback(
    (key: string) =>
      setCollapsed((open) => {
        const next = new Set(open);
        if (!next.delete(key)) next.add(key);
        return next;
      }),
    [],
  );

  // Re-grouping the catalogue is the expensive half of a keystroke; deferring it
  // keeps the Searchbar responsive while the list catches up — the same
  // treatment the weapon and spell catalogues give their own filtering.
  const applied = useDeferredValue(foldQuery(query));
  const criteria = useMemo(() => ({ kind, query: applied, rarity }), [kind, applied, rarity]);
  const { groups, total, kindTotal } = useMemo(
    () => groupTraits(INDEX, criteria, collapsed),
    [criteria, collapsed],
  );

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        onScroll={onScroll}
        contentContainerStyle={[styles.container, contentWidth]}
        bottomOffset={24}>
        <Searchbar
          placeholder="Rechercher"
          value={query}
          onChangeText={setQuery}
          icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
        />

        {pool ? <TraitPoolBar pool={pool} /> : null}

        <ChipSelect options={KIND_OPTIONS} value={kind} onChange={switchKind} />

        <ChipSelect
          label="Rareté"
          options={RARITY_OPTIONS[kind]}
          value={rarity}
          onChange={setRarity}
        />

        {onAddCustom ? (
          <CatalogCustomRow label={CUSTOM_LABEL[kind]} onPress={() => onAddCustom(kind)} />
        ) : null}

        {groups.map((group) => (
          <View key={group.rarity} style={styles.section}>
            {/* The count rides on the header, so a folded rareté still says how
                many entries it holds — that is what makes folding safe to keep
                while a search is running. */}
            <SectionHeader
              title={TRAIT_RARITY_LABEL[group.rarity] ?? group.rarity}
              icon={TRAIT_ICON[kind]}
              helper={String(group.count)}
              expanded={group.items.length > 0}
              onPress={() => toggleRarity(group.rarity)}
            />
            {group.items.map((e) => (
              <CatalogRow
                key={e.preset.id}
                icon={TRAIT_ICON[kind]}
                name={e.preset.data.name ?? ''}
                subtitle={e.subtitle}
                addLabel={`Ajouter ${e.preset.data.name}`}
                badge={traitOwnedBadge(owned?.get(e.preset.id))}
                // Flags an avantage the balance can't pay for, in the same
                // error colour the gear catalogues use for an unmet prérequis.
                // A FLAG and not a block: nothing enforces the pool.
                alert={traitUnaffordable({ kind, costs: e.preset.costs }, pool)}
                onAdd={onAdd && (() => onAdd(e.preset))}>
                <TraitDetail
                  kind={kind}
                  rarity={e.rarity}
                  cost={e.costLabel}
                  description={e.preset.data.description ?? ''}
                  inGameEffect={e.preset.data.inGameEffect}
                  evolving={e.preset.data.evolving ?? false}
                />
              </CatalogRow>
            ))}
          </View>
        ))}

        {total === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            {/* An unfilled half of the catalogue is not a failed search: telling
                the player « aucune entrée ne correspond » on a side nobody has
                typed yet sends them back to rewrite a query that was fine. */}
            {kindTotal === 0 ? EMPTY_KIND[kind] : 'Aucune entrée ne correspond.'}
          </Text>
        ) : null}
      </KeyboardAwareScrollView>
    </CatalogScrollProvider>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  // The gap <SectionCard> used to own, now that the header is driven from here.
  section: { gap: 10 },
  empty: { textAlign: 'center', marginTop: 8 },
});
