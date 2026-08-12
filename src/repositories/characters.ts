import { desc, eq, inArray, isNull } from 'drizzle-orm';

import { SPHERES } from '@/constants/prophecy';
import { db } from '@/db/client';
import { actualState, characters, type NewActualState, type NewCharacter } from '@/db/schema';
import { initiativeDiceCount, rollInitiative } from '@/lib/dice';
import { deleteCharacterMedia, deleteMedia, type MediaSlot } from '@/lib/media';
import { newUuid } from '@/lib/uuid';
import { updateActualState } from '@/repositories/actual-state';
import { logWrite } from '@/repositories/log';

/**
 * Give a portable uuid to any character that predates the `uuid` column (the
 * migration adds it nullable; see schema.ts). Idempotent — only touches NULL
 * rows — so it's safe to run on every launch after migrations succeed.
 */
export async function backfillCharacterUuids(): Promise<void> {
  const rows = await db.select({ id: characters.id }).from(characters).where(isNull(characters.uuid));
  for (const r of rows) {
    await db.update(characters).set({ uuid: newUuid() }).where(eq(characters.id, r.id));
  }
  if (rows.length > 0) logWrite('characters', 'update', { count: rows.length, phase: 'uuid-backfill' });
}

/** Magic pools whose current value should follow their max when the max changes. */
const MAGIC_MAX_TO_CURRENT: [string, string][] = [
  ['reserveMagiqueMax', 'reserveMagiqueCurrent'],
  ...SPHERES.map((s) => [`${s.key}Max`, `${s.key}Current`] as [string, string]),
];

/** Live query for the character list, newest first. Use with useLiveQuery. */
export function charactersListQuery() {
  return db.select().from(characters).orderBy(desc(characters.updatedAt));
}

/** Live query for one character by local id. Use with useLiveQuery. */
export function characterQuery(id: number) {
  return db.select().from(characters).where(eq(characters.id, id)).limit(1);
}

/**
 * Live query for one character by portable uuid. This is the bridge from a
 * campaign roster entry (whose `charId` IS the uuid) back to the local row —
 * the roster itself carries only the read-only projection.
 */
export function characterByUuidQuery(uuid: string) {
  return db.select().from(characters).where(eq(characters.uuid, uuid)).limit(1);
}

/**
 * Roll initiative for several characters at once — the GM opening a fight for
 * their whole side rather than tapping through each PNJ.
 *
 * Keyed by uuid because the caller holds roster entries. A character with no
 * die in play is skipped rather than given an empty roll, so the count returned
 * is how many actually rolled — and "in play" means the sheet's `initiativeMax`
 * PLUS the temporary `initiativeBonusDice`, hence the join: a PNJ fighting with
 * two weapons must roll its extra die here too, not only on the Fiche.
 */
export async function rollInitiativeFor(charUuids: readonly string[]): Promise<number> {
  if (charUuids.length === 0) return 0;
  const rows = await db
    .select({
      id: characters.id,
      max: characters.initiativeMax,
      bonus: actualState.initiativeBonusDice,
    })
    .from(characters)
    // Left join: a character whose state row doesn't exist yet still rolls its
    // sheet dice (bonus reads as null → 0).
    .leftJoin(actualState, eq(actualState.characterId, characters.id))
    .where(inArray(characters.uuid, [...charUuids]));
  let rolled = 0;
  for (const row of rows) {
    const dice = initiativeDiceCount(row.max ?? 0, row.bonus ?? 0);
    if (dice <= 0) continue;
    await updateActualState(row.id, { initiativeValues: rollInitiative(dice) });
    rolled++;
  }
  logWrite('actual_state', 'update', { count: rolled, phase: 'roll-initiative' });
  return rolled;
}

export async function getCharacter(id: number) {
  const rows = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCharacter(data: Partial<NewCharacter>) {
  const now = new Date();
  // Magic reserve defaults to Volonté when the form left it blank (rulebook);
  // an explicit form value wins. Never re-syncs if Volonté later changes.
  const reserve = data.reserveMagiqueMax || data.volonte || 0;
  const [row] = await db
    .insert(characters)
    .values({ ...data, reserveMagiqueMax: reserve, createdAt: now, updatedAt: now })
    .returning();
  // Spheres start full (current = max), matching the reserve/resource pools.
  const rowRec = row as unknown as Record<string, number>;
  const sphereCurrents = Object.fromEntries(
    SPHERES.map((s) => [`${s.key}Current`, rowRec[`${s.key}Max`] ?? 0]),
  ) as Partial<NewActualState>;
  // Every character gets a matching state row. Pools start full so a fresh
  // character isn't created empty.
  await db.insert(actualState).values({
    characterId: row.id,
    maitriseCurrent: row.maitriseMax,
    chanceCurrent: row.chanceMax,
    reserveMagiqueCurrent: row.reserveMagiqueMax,
    ...sphereCurrents,
  });
  logWrite('characters', 'insert', { characterId: row.id, uuid: row.uuid ?? undefined, kind: row.kind });
  return row;
}

export async function updateCharacter(id: number, data: Partial<NewCharacter>) {
  // Read the previous maxes first so we can fill a pool that just became known.
  const prev = await getCharacter(id);
  const [row] = await db
    .update(characters)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(characters.id, id))
    .returning();

  const prevRec = prev as unknown as Record<string, number> | null;
  const dataRec = data as Record<string, number>;
  const currentPatch: Record<string, number> = {};
  for (const [maxKey, curKey] of MAGIC_MAX_TO_CURRENT) {
    if (!(maxKey in dataRec)) continue;
    const prevMax = prevRec?.[maxKey] ?? 0;
    const nextMax = dataRec[maxKey] ?? 0;
    // Only fill when a pool first becomes known (0 → >0). Adjusting an already
    // known max leaves the current bullets where the player left them.
    if (prevMax === 0 && nextMax > 0) currentPatch[curKey] = nextMax;
  }
  if (Object.keys(currentPatch).length > 0) {
    await updateActualState(id, currentPatch as Partial<NewActualState>);
  }
  logWrite('characters', 'update', { characterId: id }, data);
  return row;
}

/**
 * Set (or clear, with null) a character's avatar/portrait. Deletes the file
 * previously held in that slot so replacing an image doesn't orphan it.
 */
export async function setCharacterMedia(id: number, slot: MediaSlot, path: string | null) {
  const column = slot === 'avatar' ? 'avatarPath' : 'portraitPath';
  const prev = await getCharacter(id);
  const oldPath = prev?.[column] ?? null;
  await db
    .update(characters)
    .set({ [column]: path, updatedAt: new Date() })
    .where(eq(characters.id, id));
  if (oldPath && oldPath !== path) deleteMedia(oldPath);
  // The path itself is a filename derived from the id, but never worth logging.
  logWrite('characters', 'update', { characterId: id, slot, ok: path != null }, { [column]: path });
}

export async function deleteCharacter(id: number) {
  await db.delete(characters).where(eq(characters.id, id));
  // Cascade the row's media off-DB (FK cascade can't reach the filesystem).
  deleteCharacterMedia(id);
  logWrite('characters', 'delete', { characterId: id });
}

/**
 * Delete several characters at once (list selection mode). One statement for the
 * rows — the FK cascade takes the child tables — then the media folders, which
 * SQLite can't reach.
 */
export async function deleteCharacters(ids: readonly number[]) {
  if (ids.length === 0) return;
  await db.delete(characters).where(inArray(characters.id, [...ids]));
  for (const id of ids) deleteCharacterMedia(id);
  // One line for the batch: the rows go in a single statement, so there is no
  // per-row `deleteCharacter` log to explain "my characters disappeared".
  logWrite('characters', 'delete', { ids: [...ids], count: ids.length, reason: 'batch' });
}
