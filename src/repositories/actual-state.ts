import { eq } from 'drizzle-orm';

import { actualState, type ActualState } from '@/db/schema';
import { db, type Executor } from '@/db/client';
import { logWrite } from '@/repositories/log';

/** Live query for one character's state row. Use with useLiveQuery. */
export function actualStateQuery(characterId: number) {
  return db.select().from(actualState).where(eq(actualState.characterId, characterId)).limit(1);
}

export async function getActualState(characterId: number, x: Executor = db) {
  const rows = await x
    .select()
    .from(actualState)
    .where(eq(actualState.characterId, characterId))
    .limit(1);
  return rows[0] ?? null;
}

/** Return the character's state row, creating it if missing (older rows / safety). */
export async function ensureActualState(characterId: number) {
  const existing = await getActualState(characterId);
  if (existing) return existing;
  const [row] = await db.insert(actualState).values({ characterId }).returning();
  logWrite('actual_state', 'insert', { characterId, reason: 'ensure' });
  return row;
}

/**
 * `x` lets a caller that is already in a transaction fold this write into it —
 * a bulk initiative roll, or the pool top-up `updateCharacter` does when a
 * maximum first becomes known. One statement, so it opens none of its own.
 */
export async function updateActualState(
  characterId: number,
  data: Partial<ActualState>,
  x: Executor = db,
) {
  await x
    .update(actualState)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(actualState.characterId, characterId));
  // The highest-frequency write in the app (every wound tap, every bullet) —
  // hence `debug`, and column names only.
  logWrite('actual_state', 'update', { characterId }, data);
}
