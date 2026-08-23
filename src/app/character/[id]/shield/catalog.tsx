import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import CatalogCustomRow from '@/components/catalog-custom-row';
import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { prerequisitesUnmet } from '@/components/gear-detail-rows';
import ShieldDetail from '@/components/shield-detail';
import Icon from '@/components/ui/icon';
import { SHIELD_CATALOG, type ShieldPreset } from '@/data/shield-catalog';
import { useCaracReadings } from '@/hooks/use-carac-readings';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { log } from '@/lib/log';
import { fold, foldQuery } from '@/lib/text-fold';
import { createShield } from '@/repositories/shields';

/**
 * Shield catalogue picker (modal). Flat list, no category grouping (shields
 * are one kind, unlike armor's three weight classes). Tap a row to preview it,
 * the `+` to add it — see the weapon catalogue for the reasoning.
 */
export default function ShieldCatalogModal() {
  const numId = useCharacterId();
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  const added = useCatalogSnackbar(numId, 'shield');
  const { caracValue, caracModifier } = useCaracReadings(numId);
  // Lets a row's « Replier » put itself back at the top of the screen.
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  const q = foldQuery(query);
  const filtered = useMemo(
    () =>
      q === '' ? SHIELD_CATALOG : SHIELD_CATALOG.filter((p) => fold(p.data.name ?? '').includes(q)),
    [q],
  );

  const add = async (preset?: ShieldPreset) => {
    // The picked preset's slug — see the spell catalogue for why it is logged
    // from the screen and not passed down to the repository.
    if (preset) log.info('catalog.add', { entity: 'shields', catalogId: preset.id });
    const row = await createShield(numId, preset?.data);
    // A blank shield has nothing to read here, so it still opens its editor.
    if (!preset) {
      added.openEditor(row.id);
      return;
    }
    added.announce(`« ${preset.data.name} » ajouté.`, row.id);
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
            placeholder="Rechercher un bouclier"
            value={query}
            onChangeText={setQuery}
            icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
          />

          <CatalogCustomRow label="Bouclier personnalisé" onPress={() => add()} />

          {filtered.map((p) => (
            <CatalogRow
              key={p.id}
              icon="shield"
              name={p.data.name ?? ''}
              subtitle={[p.data.damage, `Défense ${p.data.defenseMax}`, p.data.prerequisites]
                .filter((s) => s && String(s).trim() !== '')
                .join(' · ')}
              addLabel={`Ajouter ${p.data.name}`}
              alert={prerequisitesUnmet(p.data.prerequisites, caracValue)}
              onAdd={() => add(p)}>
              {/* `defenseCurrent` is seeded from the max on insert (createShield),
                  so the preview reads an undamaged shield. */}
              <ShieldDetail
                shield={{ ...p.data, defenseCurrent: p.data.defenseMax }}
                caracValue={caracValue}
                caracModifier={caracModifier}
              />
            </CatalogRow>
          ))}

          {filtered.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              Aucun bouclier ne correspond.
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
