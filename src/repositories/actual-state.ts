import { eq } from 'drizzle-orm';

import { actualState, type ActualState } from '@/db/schema';
import { db } from '@/db/client';

export async function getActualState(characterId: number) {
  const rows = await db
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
  return row;
}

export async function updateActualState(characterId: number, data: Partial<ActualState>) {
  await db
    .update(actualState)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(actualState.characterId, characterId));
}
