import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { type NewWeapon, weapons } from '@/db/schema';

/** Live query for a character's weapon catalogue (use with useLiveQuery). */
export function weaponsQuery(characterId: number) {
  return db
    .select()
    .from(weapons)
    .where(eq(weapons.characterId, characterId))
    .orderBy(asc(weapons.id));
}

/** Add a weapon (blank by default; fields edited inline afterwards). */
export async function createWeapon(characterId: number, data: Partial<NewWeapon> = {}) {
  const [row] = await db
    .insert(weapons)
    .values({ characterId, ...data })
    .returning();
  return row;
}

export async function updateWeapon(id: number, data: Partial<NewWeapon>) {
  await db.update(weapons).set(data).where(eq(weapons.id, id));
}

export async function deleteWeapon(id: number) {
  await db.delete(weapons).where(eq(weapons.id, id));
}
