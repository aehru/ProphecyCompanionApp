import { desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { actualState, characters, type NewCharacter } from '@/db/schema';

/** Live query for the character list, newest first. Use with useLiveQuery. */
export function charactersListQuery() {
  return db.select().from(characters).orderBy(desc(characters.updatedAt));
}

export async function getCharacter(id: number) {
  const rows = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCharacter(data: Partial<NewCharacter>) {
  const now = new Date();
  const [row] = await db
    .insert(characters)
    .values({ ...data, createdAt: now, updatedAt: now })
    .returning();
  // Every character gets a matching state row.
  await db.insert(actualState).values({ characterId: row.id });
  return row;
}

export async function updateCharacter(id: number, data: Partial<NewCharacter>) {
  const [row] = await db
    .update(characters)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(characters.id, id))
    .returning();
  return row;
}

export async function deleteCharacter(id: number) {
  await db.delete(characters).where(eq(characters.id, id));
}
