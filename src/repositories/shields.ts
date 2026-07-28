import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { type NewShield, shields } from '@/db/schema';
import { deleteEnchantsFor } from '@/repositories/enchants';

/** Live query for a character's shields (use with useLiveQuery). */
export function shieldsQuery(characterId: number) {
  return db.select().from(shields).where(eq(shields.characterId, characterId)).orderBy(asc(shields.id));
}

/** Live query for a single shield by id (use with useLiveQuery). */
export function shieldQuery(id: number) {
  return db.select().from(shields).where(eq(shields.id, id));
}

/**
 * Add a shield (blank or from a catalogue preset). `defenseCurrent` defaults
 * to the preset's max (an undamaged shield), unless explicitly supplied.
 */
export async function createShield(characterId: number, data: Partial<NewShield> = {}) {
  const [row] = await db
    .insert(shields)
    .values({ characterId, defenseCurrent: data.defenseMax ?? 0, ...data })
    .returning();
  return row;
}

export async function updateShield(id: number, data: Partial<NewShield>) {
  await db.update(shields).set(data).where(eq(shields.id, id));
}

export async function deleteShield(id: number) {
  await deleteEnchantsFor('shield', id);
  await db.delete(shields).where(eq(shields.id, id));
}

/** Equip one shield, unequipping every other shield of the same character. */
export async function equipShield(characterId: number, id: number) {
  await db.transaction(async (tx) => {
    await tx.update(shields).set({ equipped: false }).where(eq(shields.characterId, characterId));
    await tx.update(shields).set({ equipped: true }).where(eq(shields.id, id));
  });
}

/** Unequip a shield. */
export async function unequipShield(id: number) {
  await db.update(shields).set({ equipped: false }).where(eq(shields.id, id));
}
