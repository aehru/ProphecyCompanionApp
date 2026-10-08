// « Maison » manœuvres — see the `custom_manoeuvres` table in schema.ts for why
// they are device-wide rather than a character's child rows.

import { and, asc, eq } from 'drizzle-orm';

import { db, transaction } from '@/db/client';
import { customManoeuvres, favorites, type NewCustomManoeuvre } from '@/db/schema';
import { logWrite } from '@/repositories/log';

/** Live query for every house manœuvre on this device (use with useLiveQuery). */
export function customManoeuvresQuery() {
  return db.select().from(customManoeuvres).orderBy(asc(customManoeuvres.createdAt));
}

/** Live query for one, by id (use with useLiveQuery). */
export function customManoeuvreQuery(id: string) {
  return db.select().from(customManoeuvres).where(eq(customManoeuvres.id, id));
}

/** A blank entry, or a variant pre-filled from a rulebook one (`variantOf`). */
export async function createCustomManoeuvre(data: NewCustomManoeuvre = {}) {
  const [row] = await db.insert(customManoeuvres).values(data).returning();
  // `catalogId`: the uuid says WHICH entry, and is nothing a user typed.
  logWrite('custom_manoeuvres', 'insert', { catalogId: row?.id });
  return row;
}

export async function updateCustomManoeuvre(id: string, data: Partial<NewCustomManoeuvre>) {
  await db.update(customManoeuvres).set(data).where(eq(customManoeuvres.id, id));
  logWrite('custom_manoeuvres', 'update', { catalogId: id }, data);
}

/**
 * Delete it AND every character's star on it. A star has no foreign key — it
 * points at rulebook slugs too — so nothing cascades on its own, and a stale
 * one would sit in the table pointing at nothing.
 */
export async function deleteCustomManoeuvre(id: string) {
  await transaction(async (tx) => {
    await tx
      .delete(favorites)
      .where(and(eq(favorites.kind, 'manoeuvre'), eq(favorites.presetId, id)));
    await tx.delete(customManoeuvres).where(eq(customManoeuvres.id, id));
  });
  logWrite('custom_manoeuvres', 'delete', { catalogId: id });
}
