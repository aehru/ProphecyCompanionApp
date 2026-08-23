import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import ArmorDetail from '@/components/armor-detail';
import CatalogCustomRow from '@/components/catalog-custom-row';
import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { prerequisitesUnmet } from '@/components/gear-detail-rows';
import Icon from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { ARMOR_CATALOG, ARMOR_CATEGORIES, type ArmorPreset } from '@/data/armor-catalog';
import { useCaracReadings } from '@/hooks/use-carac-readings';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { log } from '@/lib/log';
import { fold, foldQuery } from '@/lib/text-fold';
import { createArmor } from '@/repositories/armor';

/**
 * Armor catalogue picker (modal). Tap a row to preview it, the `+` to add it —
 * see the weapon catalogue for the reasoning. Grouped by weight category, no
 * handedness sub-grouping (armor has none).
 */
export default function ArmorCatalogModal() {
  const numId = useCharacterId();
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  const added = useCatalogSnackbar(numId, 'armor');
  const { caracValue } = useCaracReadings(numId);
  // Lets a row's « Replier » put itself back at the top of the screen.
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  const q = foldQuery(query);
  const filtered = useMemo(
    () => (q === '' ? ARMOR_CATALOG : ARMOR_CATALOG.filter((p) => fold(p.data.name ?? '').includes(q))),
    [q],
  );

  const add = async (preset?: ArmorPreset) => {
    // The picked preset's slug — see the spell catalogue for why it is logged
    // from the screen and not passed down to the repository.
    if (preset) log.info('catalog.add', { entity: 'armor', catalogId: preset.id });
    const row = await createArmor(numId, preset?.data);
    // A blank armor has nothing to read here, so it still opens its editor.
    if (!preset) {
      added.openEditor(row.id);
      return;
    }
    added.announce(`« ${preset.data.name} » ajoutée.`, row.id);
  };

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <View style={styles.root}>
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

          <CatalogCustomRow label="Armure personnalisée" onPress={() => add()} />

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
                    alert={prerequisitesUnmet(p.data.prerequisites, caracValue)}
                    onAdd={() => add(p)}>
                    <ArmorDetail armor={p.data} caracValue={caracValue} />
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

        <CatalogSnackbar state={added} />
      </View>
    </CatalogScrollProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  empty: { textAlign: 'center', marginTop: 8 },
});
