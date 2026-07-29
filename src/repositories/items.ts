import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { items, type NewItem } from '@/db/schema';
import { deleteEnchantsFor } from '@/repositories/enchants';

/** Live query for a character's inventory (use with useLiveQuery). */
export function itemsQuery(characterId: number) {
  return db.select().from(items).where(eq(items.characterId, characterId)).orderBy(asc(items.id));
}

export async function createItem(characterId: number, name = '') {
  const [row] = await db.insert(items).values({ characterId, name }).returning();
  return row;
}

export async function updateItem(id: number, data: Partial<NewItem>) {
  await db.update(items).set(data).where(eq(items.id, id));
}

export async function deleteItem(id: number) {
  await deleteEnchantsFor('item', id);
  await db.delete(items).where(eq(items.id, id));
}
