// « Maison » Faveurs — see the `custom_favors` table in schema.ts. Same shape
// and contract as repositories/custom-manoeuvres.

import { and, asc, eq } from 'drizzle-orm';

import { db, transaction } from '@/db/client';
import { customFavors, favorites, type NewCustomFavor } from '@/db/schema';
import { logWrite } from '@/repositories/log';

/** Live query for every house Faveur on this device (use with useLiveQuery). */
export function customFavorsQuery() {
  return db.select().from(customFavors).orderBy(asc(customFavors.createdAt));
}

/** Live query for one, by id (use with useLiveQuery). */
export function customFavorQuery(id: string) {
  return db.select().from(customFavors).where(eq(customFavors.id, id));
}

/** A blank entry for `dragon`, or a variant pre-filled from a rulebook one (`favorVariantOf`). */
export async function createCustomFavor(data: NewCustomFavor) {
  const [row] = await db.insert(customFavors).values(data).returning();
  logWrite('custom_favors', 'insert', { catalogId: row?.id });
  return row;
}

export async function updateCustomFavor(id: string, data: Partial<NewCustomFavor>) {
  await db.update(customFavors).set(data).where(eq(customFavors.id, id));
  logWrite('custom_favors', 'update', { catalogId: id }, data);
}

/** Delete it AND every Élu's star on it — a star has no foreign key to cascade. */
export async function deleteCustomFavor(id: string) {
  await transaction(async (tx) => {
    await tx.delete(favorites).where(and(eq(favorites.kind, 'favor'), eq(favorites.presetId, id)));
    await tx.delete(customFavors).where(eq(customFavors.id, id));
  });
  logWrite('custom_favors', 'delete', { catalogId: id });
}
