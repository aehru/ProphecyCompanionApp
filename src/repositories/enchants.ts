import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { type EnchantTarget, enchants, type NewEnchant } from '@/db/schema';

/** Live query for every enchant a character owns, across all targets. */
export function enchantsQuery(characterId: number) {
  return db
    .select()
    .from(enchants)
    .where(eq(enchants.characterId, characterId))
    .orderBy(asc(enchants.id));
}

/** Live query for a single enchant by id (use with useLiveQuery). */
export function enchantQuery(id: number) {
  return db.select().from(enchants).where(eq(enchants.id, id));
}

export async function createEnchant(
  characterId: number,
  targetType: EnchantTarget,
  targetId: number,
  data: Partial<NewEnchant> = {},
) {
  const [row] = await db
    .insert(enchants)
    .values({ characterId, targetType, targetId, ...data })
    .returning();
  return row;
}

export async function updateEnchant(id: number, data: Partial<NewEnchant>) {
  await db.update(enchants).set(data).where(eq(enchants.id, id));
}

export async function deleteEnchant(id: number) {
  await db.delete(enchants).where(eq(enchants.id, id));
}

/**
 * Purge every enchant bound to one weapon/armor/item. `targetType`+`targetId`
 * is a polymorphic pointer (no real FK across the three gear tables), so each
 * of `deleteWeapon`/`deleteArmor`/`deleteItem` must call this itself before
 * deleting the object — there's no DB-level cascade to rely on.
 */
export async function deleteEnchantsFor(targetType: EnchantTarget, targetId: number) {
  await db
    .delete(enchants)
    .where(and(eq(enchants.targetType, targetType), eq(enchants.targetId, targetId)));
}
