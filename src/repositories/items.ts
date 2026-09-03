import { asc, eq } from 'drizzle-orm';

import { db, transaction } from '@/db/client';
import { items, type NewItem } from '@/db/schema';
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

export async function updateItem(id: number, data: Partial<NewItem>) {
  await db.update(items).set(data).where(eq(items.id, id));
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
