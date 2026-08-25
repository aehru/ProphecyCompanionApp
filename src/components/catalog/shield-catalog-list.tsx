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
import { SHIELD_CATALOG, type ShieldPreset } from '@/data/shield-catalog';
import type { CaracReadings } from '@/hooks/use-carac-readings';
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
}: {
  /** Resolves the dégâts formula and prérequis against a sheet. */
  readings?: CaracReadings;
  /** Called with a preset, or with nothing for « Bouclier personnalisé ». */
  onAdd?: (preset?: ShieldPreset) => void;
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

        {filtered.map((p) => (
          <CatalogRow
            key={p.id}
            icon="shield"
            name={p.data.name ?? ''}
            subtitle={[p.data.damage, `Défense ${p.data.defenseMax}`, p.data.prerequisites]
              .filter((s) => s && String(s).trim() !== '')
              .join(' · ')}
            addLabel={`Ajouter ${p.data.name}`}
            alert={prerequisitesUnmet(p.data.prerequisites, readings?.caracValue)}
            onAdd={onAdd && (() => onAdd(p))}>
            {/* `defenseCurrent` is seeded from the max on insert (createShield),
                so the preview reads an undamaged shield. */}
            <ShieldDetail
              shield={{ ...p.data, defenseCurrent: p.data.defenseMax }}
              caracValue={readings?.caracValue}
              caracModifier={readings?.caracModifier}
            />
          </CatalogRow>
        ))}

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
