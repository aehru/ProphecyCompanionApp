import { asc, eq, isNotNull } from 'drizzle-orm';

import { db, transaction } from '@/db/client';
import { characters, spells } from '@/db/schema';
import { log } from '@/lib/log';
import { syncPatch, type SpellSyncEntry } from '@/lib/spell-sync';

/**
 * Every spell on the device that came from the catalogue, with the character it
 * sits on — the input to the app-wide « mettre à jour depuis le catalogue »
 * sweep (`lib/spell-sync`). Hand-written spells are filtered out in SQL rather
 * than in the plan: they can never be a candidate, and a GM device holding a
 * dozen NPCs has no reason to carry them across the bridge.
 *
 * Ordered by character then spell id, which is the order the preview reads.
 */
export function catalogueSpellsQuery() {
  return db
    .select({ spell: spells, characterNom: characters.nom })
    .from(spells)
    .innerJoin(characters, eq(characters.id, spells.characterId))
    .where(isNotNull(spells.presetId))
    .orderBy(asc(spells.characterId), asc(spells.id));
}

/**
 * Write a settled plan: one transaction for the whole sweep, so a sheet is never
 * left half-updated. `accepted` holds the spell ids whose CONFLICTS the player
 * took from the catalogue — the fills and the revision stamp ride on every entry
 * either way (see `syncPatch`).
 */
export async function applySpellSync(
  entries: readonly SpellSyncEntry[],
  accepted: ReadonlySet<number>,
) {
  if (entries.length === 0) return;
  await transaction(async (tx) => {
    for (const entry of entries) {
      await tx
        .update(spells)
        .set(syncPatch(entry, accepted.has(entry.spellId)))
        .where(eq(spells.id, entry.spellId));
    }
  });
  // Logged here rather than per row: `updateSpell`'s own line would put one
  // entry per spell in the ring buffer for what the player experienced as a
  // single action, and the counts are what a bug report needs — how many rows
  // the sweep touched, and how many of those took a catalogue value.
  log.info('catalog.sync', {
    entity: 'spells',
    count: entries.length,
    applied: entries.filter((e) => accepted.has(e.spellId)).length,
  });
}
