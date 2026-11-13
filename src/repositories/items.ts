import { asc, eq } from 'drizzle-orm';

import { PERMANENT_UNIT } from '@/constants/prophecy';
import { db, transaction, type Executor } from '@/db/client';
import { effects, items, type Item, type NewItem } from '@/db/schema';
import { deleteEnchantsFor } from '@/repositories/enchants';
import { logWrite } from '@/repositories/log';

/** Live query for a character's inventory (use with useLiveQuery). */
export function itemsQuery(characterId: number) {
  return db.select().from(items).where(eq(items.characterId, characterId)).orderBy(asc(items.id));
}

export async function createItem(characterId: number, name = '') {
  const [row] = await db.insert(items).values({ characterId, name }).returning();
  logWrite('items', 'insert', { characterId, itemId: row?.id });
  return row;
}

/**
 * Make the item's derived `effects` row match it: present and permanent while
 * equipped with a bonus, absent otherwise. A real row rather than a merge at read
 * time, so every reader of the effects (rolls, Fiche, GM projection) counts it.
 */
export async function syncItemBonus(item: Item, x: Executor) {
  await x.delete(effects).where(eq(effects.itemId, item.id));
  if (!item.equipped || item.bonusValue === 0) return;
  await x.insert(effects).values({
    characterId: item.characterId,
    itemId: item.id,
    label: item.name,
    target: item.bonusTarget,
    value: item.bonusValue,
    durationUnit: PERMANENT_UNIT,
    durationRemaining: 0,
  });
}

export async function updateItem(id: number, data: Partial<NewItem>) {
  await transaction(async (tx) => {
    await tx.update(items).set(data).where(eq(items.id, id));
    const [row] = await tx.select().from(items).where(eq(items.id, id));
    if (row) await syncItemBonus(row, tx);
  });
  logWrite('items', 'update', { itemId: id }, data);
}

export async function deleteItem(id: number) {
  // See deleteArmor: the enchant purge is a separate statement with no FK to
  // cascade through, so it has to share the row's transaction.
  await transaction(async (tx) => {
    await deleteEnchantsFor('item', id, tx);
    await tx.delete(items).where(eq(items.id, id));
  });
  logWrite('items', 'delete', { itemId: id });
}
