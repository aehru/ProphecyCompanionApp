import { and, asc, eq, inArray } from 'drizzle-orm';

import { db, transaction } from '@/db/client';
import { type EquippedHand, type NewWeapon, weapons } from '@/db/schema';
import { deleteEnchantsFor } from '@/repositories/enchants';
import { logWrite } from '@/repositories/log';

/** Live query for a character's weapon catalogue (use with useLiveQuery). */
export function weaponsQuery(characterId: number) {
  return db
    .select()
    .from(weapons)
    .where(eq(weapons.characterId, characterId))
    .orderBy(asc(weapons.id));
}

/** Live query for a single weapon by id (use with useLiveQuery). */
export function weaponQuery(id: number) {
  return db.select().from(weapons).where(eq(weapons.id, id));
}

/** Add a weapon (blank by default; fields edited inline afterwards). */
export async function createWeapon(characterId: number, data: Partial<NewWeapon> = {}) {
  const [row] = await db
    .insert(weapons)
    .values({ characterId, ...data })
    .returning();
  logWrite('weapons', 'insert', { characterId, weaponId: row?.id });
  return row;
}

export async function updateWeapon(id: number, data: Partial<NewWeapon>) {
  await db.update(weapons).set(data).where(eq(weapons.id, id));
  logWrite('weapons', 'update', { weaponId: id }, data);
}

export async function deleteWeapon(id: number) {
  await deleteEnchantsFor('weapon', id);
  await db.delete(weapons).where(eq(weapons.id, id));
  logWrite('weapons', 'delete', { weaponId: id });
}

/**
 * Equip a weapon in the given slot. Handedness is NOT enforced — any weapon can
 * go in any slot (game advantages allow a two-handed weapon in one hand, with a
 * malus applied in play). Equipping frees the conflicting slots first:
 *  - `'both'` clears every other equipped weapon (occupies both hands);
 *  - `'main'` / `'off'` clears that hand plus any weapon holding `'both'`,
 *    allowing dual-wield (one in `'main'`, one in `'off'`).
 */
export async function equipWeapon(characterId: number, id: number, hand: EquippedHand) {
  await transaction(async (tx) => {
    if (hand === 'both') {
      await tx
        .update(weapons)
        .set({ equippedHand: null })
        .where(eq(weapons.characterId, characterId));
    } else {
      await tx
        .update(weapons)
        .set({ equippedHand: null })
        .where(and(eq(weapons.characterId, characterId), inArray(weapons.equippedHand, [hand, 'both'])));
    }
    await tx.update(weapons).set({ equippedHand: hand }).where(eq(weapons.id, id));
  });
  logWrite('weapons', 'update', { characterId, weaponId: id, slot: hand }, { equippedHand: hand });
}

/** Unequip a weapon (clears whichever hand it occupied). */
export async function unequipWeapon(id: number) {
  await db.update(weapons).set({ equippedHand: null }).where(eq(weapons.id, id));
  logWrite('weapons', 'update', { weaponId: id, slot: 'none' }, { equippedHand: null });
}
