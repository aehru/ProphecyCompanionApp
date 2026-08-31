import { and, asc, eq, ne } from 'drizzle-orm';

import { db } from '@/db/client';
import { type EnchantTarget, enchants, type NewEnchant, type Spell, spells } from '@/db/schema';
import { logWrite } from '@/repositories/log';

/** Live query for every enchant a character owns, across all targets. */
export function enchantsQuery(characterId: number) {
  return db
    .select()
    .from(enchants)
    .where(eq(enchants.characterId, characterId))
    .orderBy(asc(enchants.id));
}

/** Live query for a single enchant by id (use with useLiveQuery). */
export function enchantQuery(id: number) {
  return db.select().from(enchants).where(eq(enchants.id, id));
}

export async function createEnchant(
  characterId: number,
  targetType: EnchantTarget,
  targetId: number,
  data: Partial<NewEnchant> = {},
) {
  const [row] = await db
    .insert(enchants)
    .values({ characterId, targetType, targetId, ...data })
    .returning();
  logWrite('enchants', 'insert', { characterId, enchantId: row?.id, kind: targetType });
  return row;
}

export async function updateEnchant(id: number, data: Partial<NewEnchant>) {
  await db.update(enchants).set(data).where(eq(enchants.id, id));
  logWrite('enchants', 'update', { enchantId: id }, data);
}

/**
 * Point an enchant at a sortilège — one of the character's own, or one a hired
 * mage cast (a `known: false` row added straight from the catalogue) — or clear
 * the link with `null`.
 *
 * Copies the spell's name and effect onto the enchant (they are a frozen
 * snapshot, see the `enchants` doc comment) and prefills the difficulté the
 * enchanter rolled against. Prefill, not a mirror: it is stored on the enchant
 * precisely so the player can correct it afterwards, and re-picking a source is
 * what resets it.
 *
 * Then prunes the source it replaced: an unknown sortilège has no place in the
 * app outside the enchant that pulled it in, so once nothing points at it any
 * more it would sit in the DB forever, invisible — the spellbook filters it out
 * and no screen lists it. A KNOWN spell is never touched: it is the character's,
 * whatever the enchant does.
 */
export async function setEnchantSource(id: number, spell: Spell | null) {
  const [before] = await db
    .select({ sourceSpellId: enchants.sourceSpellId })
    .from(enchants)
    .where(eq(enchants.id, id));
  await updateEnchant(
    id,
    spell
      ? {
          name: spell.name,
          effect: spell.effect,
          sourceSpellName: spell.name,
          sourceSpellId: spell.id,
          difficulty: spell.difficulty,
        }
      : { sourceSpellName: null, sourceSpellId: null },
  );
  if (before?.sourceSpellId != null && before.sourceSpellId !== spell?.id) {
    await pruneUnknownSpell(before.sourceSpellId, id);
  }
}

/**
 * Delete a sortilège that exists ONLY as an enchant's source and is no longer
 * referenced. `exceptEnchantId` is the row whose link just changed — it may not
 * have been written yet when this runs, so its old value must not count as a
 * reference.
 *
 * The check has to precede the delete rather than lean on the FK: `sourceSpellId`
 * is `on delete set null`, so deleting a spell still referenced elsewhere would
 * quietly blank the OTHER enchants' links instead of failing.
 */
async function pruneUnknownSpell(spellId: number, exceptEnchantId?: number) {
  const [sp] = await db.select({ known: spells.known }).from(spells).where(eq(spells.id, spellId));
  if (!sp || sp.known) return;
  const refs = await db
    .select({ id: enchants.id })
    .from(enchants)
    .where(
      exceptEnchantId == null
        ? eq(enchants.sourceSpellId, spellId)
        : and(eq(enchants.sourceSpellId, spellId), ne(enchants.id, exceptEnchantId)),
    );
  if (refs.length > 0) return;
  await db.delete(spells).where(eq(spells.id, spellId));
  logWrite('spells', 'delete', { spellId, reason: 'orphan' });
}

export async function deleteEnchant(id: number) {
  const [before] = await db
    .select({ sourceSpellId: enchants.sourceSpellId })
    .from(enchants)
    .where(eq(enchants.id, id));
  await db.delete(enchants).where(eq(enchants.id, id));
  logWrite('enchants', 'delete', { enchantId: id });
  if (before?.sourceSpellId != null) await pruneUnknownSpell(before.sourceSpellId);
}

/**
 * Purge every enchant bound to one weapon/armor/item/shield. `targetType`+
 * `targetId` is a polymorphic pointer (no real FK across the four gear
 * tables), so each of `deleteWeapon`/`deleteArmor`/`deleteItem`/`deleteShield`
 * must call this itself before deleting the object — there's no DB-level
 * cascade to rely on.
 */
export async function deleteEnchantsFor(targetType: EnchantTarget, targetId: number) {
  const doomed = await db
    .select({ sourceSpellId: enchants.sourceSpellId })
    .from(enchants)
    .where(and(eq(enchants.targetType, targetType), eq(enchants.targetId, targetId)));
  await db
    .delete(enchants)
    .where(and(eq(enchants.targetType, targetType), eq(enchants.targetId, targetId)));
  logWrite('enchants', 'delete', { kind: targetType, id: targetId, reason: 'cascade' });
  // Same reasoning as `deleteEnchant`: a source nobody knows and nobody points
  // at any more is unreachable, so it goes with the enchant that carried it.
  for (const spellId of new Set(doomed.map((e) => e.sourceSpellId))) {
    if (spellId != null) await pruneUnknownSpell(spellId);
  }
}
