import { asc, eq } from 'drizzle-orm';

import { db, transaction } from '@/db/client';
import { armor, type NewArmor } from '@/db/schema';
import { deleteEnchantsFor } from '@/repositories/enchants';
import { logWrite } from '@/repositories/log';

/** Live query for a character's armor catalogue (use with useLiveQuery). */
export function armorQuery(characterId: number) {
  return db.select().from(armor).where(eq(armor.characterId, characterId)).orderBy(asc(armor.id));
}

/** Live query for a single armor by id (use with useLiveQuery). */
export function armorItemQuery(id: number) {
  return db.select().from(armor).where(eq(armor.id, id));
}

/**
 * Add an armor (blank or from a catalogue preset). The character's first
 * armor is auto-equipped. `defenseCurrent` defaults to the preset's max (an
 * undamaged piece), unless explicitly supplied.
 */
export async function createArmor(characterId: number, data: Partial<NewArmor> = {}) {
  const existing = await db
    .select({ id: armor.id })
    .from(armor)
    .where(eq(armor.characterId, characterId))
    .limit(1);
  const [row] = await db
    .insert(armor)
    .values({
      characterId,
      defenseCurrent: data.defenseMax ?? 0,
      ...data,
      equipped: existing.length === 0,
    })
    .returning();
  logWrite('armor', 'insert', { characterId, armorId: row?.id });
  return row;
}

export async function updateArmor(id: number, data: Partial<NewArmor>) {
  await db.update(armor).set(data).where(eq(armor.id, id));
  logWrite('armor', 'update', { armorId: id }, data);
}

export async function deleteArmor(id: number) {
  // One transaction: the enchants bound to this piece have no FK to cascade
  // through, so dropping them is a separate statement — and half of it landing
  // would leave the armour wearing nothing.
  await transaction(async (tx) => {
    await deleteEnchantsFor('armor', id, tx);
    await tx.delete(armor).where(eq(armor.id, id));
  });
  logWrite('armor', 'delete', { armorId: id });
}

/** Equip one armor, unequipping every other armor of the same character. */
export async function equipArmor(characterId: number, id: number) {
  await transaction(async (tx) => {
    await tx.update(armor).set({ equipped: false }).where(eq(armor.characterId, characterId));
    await tx.update(armor).set({ equipped: true }).where(eq(armor.id, id));
  });
  logWrite('armor', 'update', { characterId, armorId: id }, { equipped: true });
}
