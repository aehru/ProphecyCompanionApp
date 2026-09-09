import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import SpellCatalogList from '@/components/catalog/spell-catalog-list';
import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { type SpellPreset } from '@/data/spell-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { useFavorites } from '@/hooks/use-favorites';
import { useSpellTotal } from '@/hooks/use-spell-total';
import { log } from '@/lib/log';
import { setFavorite } from '@/repositories/favorites';
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
  const favorites = useFavorites(numId, 'spell');
  const added = useCatalogSnackbar(numId, 'spell');
  const { announce, openEditor } = added;

  /**
   * Which presets are already in this character's spellbook. `preset_id` and
   * not the name: a renamed spell is still the same pick, and a hand-written
   * one has no id and must never be flagged.
   *
   * Unknown rows are counted SEPARATELY: a sortilège that only exists because a
   * hired mage enchanted an object with it is not in the spellbook, and badging
   * it « Déjà ajouté » would talk the player out of learning it. It gets
   * « Enchanté » instead — still worth seeing, since it says the character has
   * already met this spell.
   */
  const { owned, enchanted } = useMemo(() => {
    const own = new Set<string>();
    const ench = new Set<string>();
    for (const r of ownedRows ?? []) {
      if (r.presetId) (r.known ? own : ench).add(r.presetId);
    }
    return { owned: own, enchanted: ench };
  }, [ownedRows]);

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
      // The star follows the spell. A catalogue star means « je compte
      // l'apprendre »; once learned, that sentence is spent — so it carries
      // onto the new row (where it means « je le lance tout le temps ») and the
      // catalogue's is cleared. Leaving both would show the same sortilège
      // starred on the shopping list and unstarred in the spellbook.
      const starred = preset ? favorites.ids.has(preset.id) : false;
      const row = await createSpell(
        numId,
        preset && {
          ...preset.data,
          presetId: preset.id,
          presetRevision: preset.revision,
          favorite: starred,
        },
      );
      if (preset && starred) await setFavorite(numId, 'spell', preset.id, false);
      // A blank spell has nothing to read in the catalogue, so it still opens
      // its editor; a preset stays here so the player can pick the next one.
      if (!preset) {
        openEditor(row.id);
        return;
      }
      announce(`« ${preset.data.name} » ajouté.`, row.id);
    },
    // The two actions are stable (see useCatalogSnackbar), so `add` is too —
    // `favorites` is the one moving part, and it only changes when a star is
    // tapped, which the list has to re-render for anyway.
    [numId, announce, openEditor, favorites],
  );

  return (
    <View style={styles.root}>
      <SpellCatalogList
        readings={readings}
        owned={owned}
        enchanted={enchanted}
        onAdd={add}
        favorites={favorites.ids}
        onToggleFavorite={favorites.toggle}
      />
      <CatalogSnackbar state={added} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
