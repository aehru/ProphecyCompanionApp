import { desc, eq } from 'drizzle-orm';

import { SPHERES } from '@/constants/prophecy';
import { db } from '@/db/client';
import { actualState, characters, type NewActualState, type NewCharacter } from '@/db/schema';
import { deleteCharacterMedia, deleteMedia, type MediaSlot } from '@/lib/media';
import { updateActualState } from '@/repositories/actual-state';

/** Magic pools whose current value should follow their max when the max changes. */
const MAGIC_MAX_TO_CURRENT: [string, string][] = [
  ['reserveMagiqueMax', 'reserveMagiqueCurrent'],
  ...SPHERES.map((s) => [`${s.key}Max`, `${s.key}Current`] as [string, string]),
];

/** Live query for the character list, newest first. Use with useLiveQuery. */
export function charactersListQuery() {
  return db.select().from(characters).orderBy(desc(characters.updatedAt));
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
}

export async function deleteCharacter(id: number) {
  await db.delete(characters).where(eq(characters.id, id));
  // Cascade the row's media off-DB (FK cascade can't reach the filesystem).
  deleteCharacterMedia(id);
}
