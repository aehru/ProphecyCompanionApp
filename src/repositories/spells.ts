import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { type NewSpell, spells } from '@/db/schema';
import { logWrite } from '@/repositories/log';

/** Live query for a character's spellbook (use with useLiveQuery). */
export function spellsQuery(characterId: number) {
  return db.select().from(spells).where(eq(spells.characterId, characterId)).orderBy(asc(spells.id));
}

/**
 * The spellbook proper — what the character can actually cast.
 *
 * `spellsQuery` returns EVERY row, unknown sortilèges included: those exist only
 * because an enchant points at them (a spell another mage cast into an object),
 * and showing them among the character's own would claim they can cast it. Any
 * screen listing "the character's spells" wants this one; the enchant editor,
 * which has to resolve its own source, wants the unfiltered query.
 */
export function knownSpellsQuery(characterId: number) {
  return db
    .select()
    .from(spells)
    .where(and(eq(spells.characterId, characterId), eq(spells.known, true)))
    .orderBy(asc(spells.id));
}

/** Live query for a single spell by id (use with useLiveQuery). */
export function spellQuery(id: number) {
  return db.select().from(spells).where(eq(spells.id, id));
}

/** Add a spell (blank by default; fields edited in the modal afterwards). */
export async function createSpell(characterId: number, data: Partial<NewSpell> = {}) {
  const [row] = await db
    .insert(spells)
    .values({ characterId, ...data })
    .returning();
  logWrite('spells', 'insert', { characterId, spellId: row?.id });
  return row;
}

export async function updateSpell(id: number, data: Partial<NewSpell>) {
  await db.update(spells).set(data).where(eq(spells.id, id));
  logWrite('spells', 'update', { spellId: id }, data);
}

export async function deleteSpell(id: number) {
  await db.delete(spells).where(eq(spells.id, id));
  logWrite('spells', 'delete', { spellId: id });
}
