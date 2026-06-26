import { and, asc, eq, gt, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { effects, type NewEffect } from '@/db/schema';

/** Live query for a character's temporary effects (use with useLiveQuery). */
export function effectsQuery(characterId: number) {
  return db
    .select()
    .from(effects)
    .where(eq(effects.characterId, characterId))
    .orderBy(asc(effects.createdAt));
}

/** Add an effect. New effects start un-expired. */
export async function createEffect(characterId: number, data: Partial<NewEffect> = {}) {
  const [row] = await db
    .insert(effects)
    .values({ characterId, expired: false, ...data })
    .returning();
  return row;
}

export async function updateEffect(id: number, data: Partial<NewEffect>) {
  await db.update(effects).set(data).where(eq(effects.id, id));
}

export async function deleteEffect(id: number) {
  await db.delete(effects).where(eq(effects.id, id));
}

/**
 * Advance time by one tick of a single unit: decrement `durationRemaining` for
 * the character's active effects of that unit, then mark any that hit 0 as
 * expired. Effects of other units are untouched.
 */
export async function tickUnit(characterId: number, unit: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(effects)
      .set({ durationRemaining: sql`${effects.durationRemaining} - 1` })
      .where(
        and(
          eq(effects.characterId, characterId),
          eq(effects.durationUnit, unit),
          eq(effects.expired, false),
          gt(effects.durationRemaining, 0),
        ),
      );
    await tx
      .update(effects)
      .set({ expired: true })
      .where(
        and(
          eq(effects.characterId, characterId),
          eq(effects.durationUnit, unit),
          eq(effects.expired, false),
          sql`${effects.durationRemaining} <= 0`,
        ),
      );
  });
}
