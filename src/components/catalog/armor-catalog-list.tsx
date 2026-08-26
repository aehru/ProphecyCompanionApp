import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import ArmorDetail from '@/components/armor-detail';
import CatalogCustomRow from '@/components/catalog-custom-row';
import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import { prerequisitesUnmet } from '@/components/gear-detail-rows';
import Icon from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { ARMOR_CATALOG, ARMOR_CATEGORIES, type ArmorPreset } from '@/data/armor-catalog';
import type { CaracReadings } from '@/hooks/use-carac-readings';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fold, foldQuery } from '@/lib/text-fold';

/**
 * The armor catalogue itself — search, weight-category grouping and rows, with
 * no idea whose it is. No handedness sub-grouping (armor has none).
 *
 * Both props are optional: see {@link WeaponCatalogList} for why the picker and
 * the character-free reference are the same list.
 */
export default function ArmorCatalogList({
  readings,
  onAdd,
}: {
  /** Resolves prérequis against a sheet. */
  readings?: CaracReadings;
  /** Called with a preset, or with nothing for « Armure personnalisée ». */
  onAdd?: (preset?: ArmorPreset) => void;
}) {
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  // Lets a row's « Replier » put itself back at the top of the screen.
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  const q = foldQuery(query);
  const filtered = useMemo(
    () =>
      q === '' ? ARMOR_CATALOG : ARMOR_CATALOG.filter((p) => fold(p.data.name ?? '').includes(q)),
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
          placeholder="Rechercher une armure"
          value={query}
          onChangeText={setQuery}
          icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
        />

        {onAdd ? <CatalogCustomRow label="Armure personnalisée" onPress={() => onAdd()} /> : null}

        {ARMOR_CATEGORIES.map((cat) => {
          const items = filtered.filter((p) => p.category === cat);
          if (items.length === 0) return null;
          return (
            <SectionCard key={cat} title={cat} icon="shield">
              {items.map((p) => (
                <CatalogRow
                  key={p.id}
                  icon="shield"
                  name={p.data.name ?? ''}
                  subtitle={[`Défense ${p.data.defenseMax}`, p.data.prerequisites]
                    .filter((s) => s && String(s).trim() !== '')
                    .join(' · ')}
                  addLabel={`Ajouter ${p.data.name}`}
                  alert={prerequisitesUnmet(p.data.prerequisites, readings?.caracValue)}
                  onAdd={onAdd && (() => onAdd(p))}>
                  <ArmorDetail armor={p.data} caracValue={readings?.caracValue} />
                </CatalogRow>
              ))}
            </SectionCard>
          );
        })}

        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            Aucune armure ne correspond.
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
