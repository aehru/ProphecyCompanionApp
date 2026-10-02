import { and, desc, eq, isNull } from 'drizzle-orm';

import type { ValeurKey } from '@/constants/prophecy';
import { db } from '@/db/client';
import { type NewXpAward, xpAwards } from '@/db/schema';
import type { ValeurScores } from '@/lib/xp';
import { logWrite } from '@/repositories/log';

/** Live query for a character's scénarios, newest first (use with useLiveQuery). */
export function xpAwardsQuery(characterId: number) {
  return db
    .select()
    .from(xpAwards)
    .where(eq(xpAwards.characterId, characterId))
    .orderBy(desc(xpAwards.id));
}

/**
 * Open a scénario with the Valeur the player picked. At most one is open at a
 * time: a second start while one is running returns that one untouched rather
 * than stacking two half-played scénarios.
 */
export async function startScenario(characterId: number, chosenValeur: ValeurKey, label = '') {
  const [open] = await db
    .select()
    .from(xpAwards)
    .where(and(eq(xpAwards.characterId, characterId), isNull(xpAwards.endedAt)))
    .limit(1);
  if (open) return open;
  const [row] = await db.insert(xpAwards).values({ characterId, chosenValeur, label }).returning();
  logWrite('xp_awards', 'insert', { characterId, xpAwardId: row?.id });
  return row;
}

/** Record the GM's scores and close the scénario. */
export async function endScenario(id: number, scores: ValeurScores) {
  await updateXpAward(id, { ...scores, endedAt: new Date() });
}

export async function updateXpAward(id: number, data: Partial<NewXpAward>) {
  await db.update(xpAwards).set(data).where(eq(xpAwards.id, id));
  logWrite('xp_awards', 'update', { xpAwardId: id }, data);
}

export async function deleteXpAward(id: number) {
  await db.delete(xpAwards).where(eq(xpAwards.id, id));
  logWrite('xp_awards', 'delete', { xpAwardId: id });
}
