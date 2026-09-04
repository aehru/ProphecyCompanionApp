import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import TraitCatalogList from '@/components/catalog/trait-catalog-list';
import TraitPickDialog, { type TraitPick } from '@/components/trait-pick-dialog';
import type { TraitKind } from '@/constants/prophecy';
import type { TraitPreset } from '@/data/trait-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { log } from '@/lib/log';
import { traitPool } from '@/lib/trait-pool';
import { createTrait, traitsQuery } from '@/repositories/traits';

/**
 * Avantages / désavantages picker (modal). Tap a row to read the entry, the `+`
 * to take it. Adding keeps the catalogue open — a character takes a handful of
 * désavantages in one sitting — and the toast links to the new row's editor.
 *
 * The character's own pool rides along, so the list can show what is left and
 * flag an avantage that costs more than that. It FLAGS and never blocks: the
 * pool is not enforced anywhere else either, and a player who overspends on
 * purpose is doing something the rulebook lets them settle with their GM.
 *
 * An entry the catalogue cannot fully answer for — several prices, or a
 * précision to fill in — stops on {@link TraitPickDialog} first.
 */
export default function TraitCatalogModal() {
  const numId = useCharacterId();
  const { data: ownedRows } = useLiveQuery(traitsQuery(numId), [numId]);
  const added = useCatalogSnackbar(numId, 'trait');
  const { announce, openEditor } = added;
  // The entry waiting on an answer, if any.
  const [picking, setPicking] = useState<TraitPreset | null>(null);

  /**
   * How many times each preset is already on this character's sheet. A COUNT
   * and not a flag: several entries are explicitly « peut survenir plusieurs
   * fois » (Dette, Ennemi, Interdit, Maladie), and « Déjà ajouté ×2 » is the
   * honest badge for a second Dette where a plain « Déjà ajouté » would read as
   * a warning against doing something the rulebook allows.
   *
   * Keyed by `presetId` and not by name: a renamed entry is still the same pick,
   * and a hand-written one has no id and must never be counted.
   */
  const owned = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of ownedRows ?? []) {
      if (row.presetId) counts.set(row.presetId, (counts.get(row.presetId) ?? 0) + 1);
    }
    return counts;
  }, [ownedRows]);

  const pool = useMemo(() => traitPool(ownedRows ?? []), [ownedRows]);

  const insert = useCallback(
    async (preset: TraitPreset, pick: TraitPick) => {
      // Which preset was picked, logged HERE rather than threaded through the
      // repository — see the spell picker for the reasoning.
      log.info('catalog.add', { entity: 'traits', catalogId: preset.id });
      const row = await createTrait(numId, {
        ...preset.data,
        cost: pick.cost,
        note: pick.note,
        // Provenance stamped next to the pick: the slug and the revision it was
        // copied at are what let a later catalogue correction find this row, and
        // their absence is what marks an entry as the player's own.
        presetId: preset.id,
        presetRevision: preset.revision,
      });
      announce(`« ${preset.data.name} » ajouté.`, row.id);
    },
    [numId, announce],
  );

  // A blank entry has nothing left to read in the catalogue, so it goes
  // straight to its editor — on the side of the pool the player was browsing.
  const addCustom = useCallback(
    async (kind: TraitKind) => {
      const row = await createTrait(numId, { kind });
      openEditor(row.id);
    },
    [numId, openEditor],
  );

  const add = useCallback(
    async (preset: TraitPreset) => {
      if (preset.costs.length > 1 || preset.precisionPrompt) {
        setPicking(preset);
        return;
      }
      await insert(preset, { cost: preset.costs[0], note: '' });
    },
    [insert],
  );

  return (
    <View style={styles.root}>
      <TraitCatalogList owned={owned} pool={pool} onAdd={add} onAddCustom={addCustom} />
      <TraitPickDialog
        // Keyed by the entry: the dialog opens on that entry's cheapest tier and
        // an empty précision, which it can only do by mounting fresh (see its
        // doc comment).
        key={picking?.id ?? 'none'}
        preset={picking}
        onDismiss={() => setPicking(null)}
        onConfirm={(preset, pick) => {
          setPicking(null);
          insert(preset, pick);
        }}
      />
      <CatalogSnackbar state={added} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
