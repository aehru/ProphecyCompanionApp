import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { armor, type NewArmor } from '@/db/schema';

/** Live query for a character's armor catalogue (use with useLiveQuery). */
export function armorQuery(characterId: number) {
  return db.select().from(armor).where(eq(armor.characterId, characterId)).orderBy(asc(armor.id));
}

/** Add an armor. The character's first armor is auto-equipped. */
export async function createArmor(characterId: number, name = '') {
  const existing = await db
    .select({ id: armor.id })
    .from(armor)
    .where(eq(armor.characterId, characterId))
    .limit(1);
  const [row] = await db
    .insert(armor)
    .values({ characterId, name, equipped: existing.length === 0 })
    .returning();
  return row;
}

export async function updateArmor(id: number, data: Partial<NewArmor>) {
  await db.update(armor).set(data).where(eq(armor.id, id));
}

export async function deleteArmor(id: number) {
  await db.delete(armor).where(eq(armor.id, id));
}

/** Equip one armor, unequipping every other armor of the same character. */
export async function equipArmor(characterId: number, id: number) {
  await db.transaction(async (tx) => {
    await tx.update(armor).set({ equipped: false }).where(eq(armor.characterId, characterId));
    await tx.update(armor).set({ equipped: true }).where(eq(armor.id, id));
  });
}
