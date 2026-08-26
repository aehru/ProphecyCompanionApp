import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import SpellCatalogList from '@/components/catalog/spell-catalog-list';
import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { type SpellPreset } from '@/data/spell-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { useSpellTotal } from '@/hooks/use-spell-total';
import { log } from '@/lib/log';
import { createSpell, spellsQuery } from '@/repositories/spells';

/**
 * Spell catalogue picker (modal). Tap a row to preview the sortilège — the same
 * detail the Magie tab shows, with this character's casting score — or the `+`
 * to add it. Adding keeps the catalogue open; the toast links to the new
 * spell's editor.
 *
 * The list itself is {@link SpellCatalogList}, shared with the catalogue browsed
 * from the home page; this screen is only what a character adds to it.
 */
export default function SpellCatalogModal() {
  const numId = useCharacterId();
  // Same score the Magie tab shows — a player picking a spell wants to know
  // what they would cast it at BEFORE adding it.
  const readings = useSpellTotal(numId);
  const { data: ownedRows } = useLiveQuery(spellsQuery(numId), [numId]);
  const added = useCatalogSnackbar(numId, 'spell');
  const { announce, openEditor } = added;

  /**
   * Which presets are already in this character's spellbook. `preset_id` and
   * not the name: a renamed spell is still the same pick, and a hand-written
   * one has no id and must never be flagged.
   */
  const owned = useMemo(
    () => new Set((ownedRows ?? []).map((r) => r.presetId).filter((id): id is string => !!id)),
    [ownedRows],
  );

  const add = useCallback(
    async (preset?: SpellPreset) => {
      // Which preset was picked, logged HERE rather than threaded through the
      // repository: the slug is a UI fact (what the catalogue offered), and a
      // report saying only "spell 11 inserted" can't tell a bad generated preset
      // from a bad hand edit. Custom spells have no slug and no line.
      if (preset) log.info('catalog.add', { entity: 'spells', catalogId: preset.id });
      // Provenance stamped HERE, next to the pick: the slug and the revision it
      // was copied at are what let a later catalogue correction find this row
      // again — and their absence is what marks « Sortilège personnalisé » as
      // the player's own, forever off limits.
      const row = await createSpell(
        numId,
        preset && { ...preset.data, presetId: preset.id, presetRevision: preset.revision },
      );
      // A blank spell has nothing to read in the catalogue, so it still opens
      // its editor; a preset stays here so the player can pick the next one.
      if (!preset) {
        openEditor(row.id);
        return;
      }
      announce(`« ${preset.data.name} » ajouté.`, row.id);
    },
    // The two actions are stable (see useCatalogSnackbar), so `add` is too —
    // which is what keeps the list's `renderItem` and its memoized rows from
    // churning.
    [numId, announce, openEditor],
  );

  return (
    <View style={styles.root}>
      <SpellCatalogList readings={readings} owned={owned} onAdd={add} />
      <CatalogSnackbar state={added} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
