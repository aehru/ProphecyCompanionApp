import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { type NewPrivilege, privileges } from '@/db/schema';
import { logWrite } from '@/repositories/log';

/** Live query for a character's privilèges (use with useLiveQuery). */
export function privilegesQuery(characterId: number) {
  return db
    .select()
    .from(privileges)
    .where(eq(privileges.characterId, characterId))
    .orderBy(asc(privileges.id));
}

/** Live query for a single privilège by id (use with useLiveQuery). */
export function privilegeQuery(id: number) {
  return db.select().from(privileges).where(eq(privileges.id, id));
}

export async function createPrivilege(
  characterId: number,
  data: Omit<NewPrivilege, 'characterId' | 'id'>,
) {
  const [row] = await db
    .insert(privileges)
    .values({ characterId, ...data })
    .returning();
  logWrite('privileges', 'insert', { characterId, privilegeId: row?.id });
  return row;
}

export async function updatePrivilege(id: number, data: Partial<NewPrivilege>) {
  await db.update(privileges).set(data).where(eq(privileges.id, id));
  logWrite('privileges', 'update', { privilegeId: id }, data);
}

export async function deletePrivilege(id: number) {
  await db.delete(privileges).where(eq(privileges.id, id));
  logWrite('privileges', 'delete', { privilegeId: id });
}
