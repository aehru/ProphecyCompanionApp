import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { type NewTrait, traits } from '@/db/schema';
import { logWrite } from '@/repositories/log';

/**
 * Live query for a character's avantages and désavantages (use with
 * useLiveQuery). BOTH kinds in one query on purpose: every screen showing one
 * shows the pool balance, which needs the other half too (`lib/trait-pool`).
 */
export function traitsQuery(characterId: number) {
  return db.select().from(traits).where(eq(traits.characterId, characterId)).orderBy(asc(traits.id));
}

/** Live query for a single trait by id (use with useLiveQuery). */
export function traitQuery(id: number) {
  return db.select().from(traits).where(eq(traits.id, id));
}

/**
 * Add an avantage or a désavantage. `kind` is required and has no default: it
 * decides which side of the pool the cost lands on, and guessing it wrong turns
 * points granted into points spent.
 */
export async function createTrait(
  characterId: number,
  data: Omit<NewTrait, 'characterId' | 'id'>,
) {
  const [row] = await db
    .insert(traits)
    .values({ characterId, ...data })
    .returning();
  logWrite('traits', 'insert', { characterId, traitId: row?.id });
  return row;
}

export async function updateTrait(id: number, data: Partial<NewTrait>) {
  await db.update(traits).set(data).where(eq(traits.id, id));
  logWrite('traits', 'update', { traitId: id }, data);
}

export async function deleteTrait(id: number) {
  await db.delete(traits).where(eq(traits.id, id));
  logWrite('traits', 'delete', { traitId: id });
}
