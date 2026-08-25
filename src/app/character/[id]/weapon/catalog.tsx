import React from 'react';
import { StyleSheet, View } from 'react-native';

import WeaponCatalogList from '@/components/catalog/weapon-catalog-list';
import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { HAND_VALUE, type WeaponPreset } from '@/data/weapon-catalog';
import { useCaracReadings } from '@/hooks/use-carac-readings';
import { useCharacterId } from '@/hooks/use-character-id';
import { log } from '@/lib/log';
import { createWeapon } from '@/repositories/weapons';

/**
 * Weapon catalogue picker (modal). Tap a row to preview it — the same detail
 * the Fiche shows, resolved against this character — or the `+` to add it.
 * Adding keeps the catalogue open (a player usually equips a party, not one
 * sword); the toast links to the new weapon's editor.
 *
 * The list itself is {@link WeaponCatalogList}, shared with the catalogue
 * browsed from the home page; this screen is only what a character adds to it.
 */
export default function WeaponCatalogModal() {
  const numId = useCharacterId();
  const added = useCatalogSnackbar(numId, 'weapon');
  // Same readings the Inventaire tab feeds its cards — a player picking a weapon
  // wants to know what it does in THEIR hands before adding it.
  const readings = useCaracReadings(numId);

  const add = async (preset?: WeaponPreset) => {
    // Persist the preset's handedness (label → schema int) onto the new weapon.
    const data = preset ? { ...preset.data, hands: HAND_VALUE[preset.hands] } : undefined;
    // The picked preset's slug — see the spell catalogue for why it is logged
    // from the screen and not passed down to the repository.
    if (preset) log.info('catalog.add', { entity: 'weapons', catalogId: preset.id });
    const row = await createWeapon(numId, data);
    // A blank weapon has nothing to read in the catalogue, so it still opens its
    // editor; a preset stays here so the player can pick the next one.
    if (!preset) {
      added.openEditor(row.id);
      return;
    }
    added.announce(`« ${preset.data.name} » ajoutée.`, row.id);
  };

  return (
    <View style={styles.root}>
      <WeaponCatalogList readings={readings} onAdd={add} />
      <CatalogSnackbar state={added} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
