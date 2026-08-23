import React from 'react';
import { StyleSheet, View } from 'react-native';

import ArmorCatalogList from '@/components/catalog/armor-catalog-list';
import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { type ArmorPreset } from '@/data/armor-catalog';
import { useCaracReadings } from '@/hooks/use-carac-readings';
import { useCharacterId } from '@/hooks/use-character-id';
import { log } from '@/lib/log';
import { createArmor } from '@/repositories/armor';

/**
 * Armor catalogue picker (modal). Tap a row to preview it, the `+` to add it —
 * see the weapon catalogue for the reasoning. The list is
 * {@link ArmorCatalogList}, shared with the catalogue browsed from the home
 * page; this screen is only what a character adds to it.
 */
export default function ArmorCatalogModal() {
  const numId = useCharacterId();
  const added = useCatalogSnackbar(numId, 'armor');
  const readings = useCaracReadings(numId);

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
    <View style={styles.root}>
      <ArmorCatalogList readings={readings} onAdd={add} />
      <CatalogSnackbar state={added} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
