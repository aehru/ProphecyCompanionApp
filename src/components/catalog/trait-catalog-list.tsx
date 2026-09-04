import React, { useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
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
import SectionCard from '@/components/ui/section-card';
import { TRAIT_KINDS, TRAIT_RARITY_LABEL, type TraitKind } from '@/constants/prophecy';
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
  // Lets a row's « Replier » put itself back at the top of the screen.
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  // Re-grouping the catalogue is the expensive half of a keystroke; deferring it
  // keeps the Searchbar responsive while the list catches up — the same
  // treatment the weapon and spell catalogues give their own filtering.
  const applied = useDeferredValue(foldQuery(query));
  const { groups, total, kindTotal } = useMemo(
    () => groupTraits(INDEX, kind, applied),
    [kind, applied],
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

        <ChipSelect
          options={KIND_OPTIONS}
          value={kind}
          onChange={(key) => setKind(key as TraitKind)}
        />

        {onAddCustom ? (
          <CatalogCustomRow label={CUSTOM_LABEL[kind]} onPress={() => onAddCustom(kind)} />
        ) : null}

        {groups.map(({ rarity, items }) => (
          <SectionCard
            key={rarity}
            title={TRAIT_RARITY_LABEL[rarity] ?? rarity}
            icon={TRAIT_ICON[kind]}>
            {items.map((e) => (
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
                />
              </CatalogRow>
            ))}
          </SectionCard>
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
  empty: { textAlign: 'center', marginTop: 8 },
});
