import React from 'react';
import { StyleSheet, View } from 'react-native';

import ShieldCatalogList from '@/components/catalog/shield-catalog-list';
import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { type ShieldPreset } from '@/data/shield-catalog';
import { useCaracReadings } from '@/hooks/use-carac-readings';
import { useCharacterId } from '@/hooks/use-character-id';
import { log } from '@/lib/log';
import { createShield } from '@/repositories/shields';

/**
 * Shield catalogue picker (modal). Tap a row to preview it, the `+` to add it —
 * see the weapon catalogue for the reasoning. The list is
 * {@link ShieldCatalogList}, shared with the catalogue browsed from the home
 * page; this screen is only what a character adds to it.
 */
export default function ShieldCatalogModal() {
  const numId = useCharacterId();
  const added = useCatalogSnackbar(numId, 'shield');
  const readings = useCaracReadings(numId);

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
    <View style={styles.root}>
      <ShieldCatalogList readings={readings} onAdd={add} />
      <CatalogSnackbar state={added} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
