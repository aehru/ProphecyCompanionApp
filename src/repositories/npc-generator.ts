import { db } from '@/db/client';
import { characters } from '@/db/schema';
import type { GeneratedNpc } from '@/lib/npc-generator';
import { createCharacter } from '@/repositories/characters';
import { logWrite } from '@/repositories/log';
import { replaceSkills } from '@/repositories/skills';

/**
 * Writing side of the PNJ generator: everything rolled in `lib/npc-generator`
 * lands here, and nothing is decided here. The engine stays testable in plain
 * Node, and this file stays a couple of inserts.
 */

/**
 * Every character name in the DB — what the generator needs to hand out a name
 * nobody at the table already carries.
 *
 * A narrow projection on purpose, like `charactersListQuery`: this runs before
 * each generation and has no business dragging portraits through the driver.
 */
export async function characterNames(): Promise<string[]> {
  const rows = await db.select({ nom: characters.nom }).from(characters);
  return rows.map((r) => r.nom);
}

/**
 * Persist a generated batch, in order. Returns the new local ids so the caller
 * can navigate straight to a single PNJ's sheet.
 *
 * Row by row rather than in one transaction, matching `createNpc`/`spawnNpc`:
 * `createCharacter` also seeds `actual_state` (and fills the magic reserve from
 * Volonté), and duplicating that inside a transaction body would be a second
 * copy of a rule that already lives in one place. A PNJ that fails halfway
 * leaves the ones before it on the roster, which is the useful outcome — the GM
 * keeps what generated.
 */
export async function saveGeneratedNpcs(npcs: readonly GeneratedNpc[]): Promise<number[]> {
  const ids: number[] = [];
  for (const npc of npcs) {
    const row = await createCharacter(npc.character);
    if (npc.skills.length > 0) await replaceSkills(row.id, npc.skills);
    ids.push(row.id);
  }
  // One line for the batch — `createCharacter` already logs each row, and this
  // is what says the rows came from the generator (and from which archetype).
  // The archetype rides as `catalogId` — the log's allow-listed key for an
  // authored catalogue slug, which is exactly what an archetype id is.
  logWrite('characters', 'insert', {
    count: ids.length,
    catalogId: npcs[0]?.archetypeId,
    phase: 'generate-npc',
  });
  return ids;
}
