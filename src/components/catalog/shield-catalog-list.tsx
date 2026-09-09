import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import CatalogCustomRow from '@/components/catalog-custom-row';
import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import { prerequisitesUnmet } from '@/components/gear-detail-rows';
import ShieldDetail from '@/components/shield-detail';
import Icon from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { SHIELD_CATALOG, type ShieldPreset } from '@/data/shield-catalog';
import type { CaracReadings } from '@/hooks/use-carac-readings';
import type { Favorites } from '@/hooks/use-favorites';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fold, foldQuery } from '@/lib/text-fold';


/**
 * The shield catalogue itself — search and rows, with no idea whose it is. Flat
 * list, no category grouping (shields are one kind, unlike armor's three weight
 * classes).
 *
 * Both props are optional: see {@link WeaponCatalogList} for why the picker and
 * the character-free reference are the same list.
 */
export default function ShieldCatalogList({
  readings,
  onAdd,
  favorites,
}: {
  /** Resolves the dégâts formula and prérequis against a sheet. */
  readings?: CaracReadings;
  /** Called with a preset, or with nothing for « Bouclier personnalisé ». */
  onAdd?: (preset?: ShieldPreset) => void;
  /** The reader's shopping list. Absent when no character is reading. */
  favorites?: Favorites;
}) {
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  // Lets a row's « Replier » put itself back at the top of the screen.
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  const q = foldQuery(query);
  const filtered = useMemo(
    () =>
      q === '' ? SHIELD_CATALOG : SHIELD_CATALOG.filter((p) => fold(p.data.name ?? '').includes(q)),
    [q],
  );

  const renderRow = (p: ShieldPreset) => (
    <CatalogRow
      key={p.id}
      icon="shield"
      name={p.data.name ?? ''}
      subtitle={[p.data.damage, `Défense ${p.data.defenseMax}`, p.data.prerequisites]
        .filter((s) => s && String(s).trim() !== '')
        .join(' · ')}
      addLabel={`Ajouter ${p.data.name}`}
      alert={prerequisitesUnmet(p.data.prerequisites, readings?.caracValue)}
      presetId={p.id}
      favorites={favorites}
      onAdd={onAdd && (() => onAdd(p))}>
      {/* `defenseCurrent` is seeded from the max on insert (createShield), so
          the preview reads an undamaged shield. */}
      <ShieldDetail
        shield={{ ...p.data, defenseCurrent: p.data.defenseMax }}
        caracValue={readings?.caracValue}
        caracModifier={readings?.caracModifier}
      />
    </CatalogRow>
  );

  // Starred entries first, and they stay in the list below — the boucliers are
  // one flat list, so the Favoris card is the only grouping there is.
  const starred = favorites ? filtered.filter((p) => favorites.ids.has(p.id)) : [];

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        onScroll={onScroll}
        contentContainerStyle={[styles.container, contentWidth]}
        bottomOffset={24}>
        <Searchbar
          placeholder="Rechercher un bouclier"
          value={query}
          onChangeText={setQuery}
          icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
        />

        {onAdd ? <CatalogCustomRow label="Bouclier personnalisé" onPress={() => onAdd()} /> : null}

        {starred.length > 0 ? (
          <SectionCard title="Favoris" icon="star">
            {starred.map(renderRow)}
          </SectionCard>
        ) : null}

        {filtered.map(renderRow)}

        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            Aucun bouclier ne correspond.
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
