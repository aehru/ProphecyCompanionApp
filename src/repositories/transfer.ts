import { eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  actualState,
  armor,
  characters,
  effects,
  skills,
  spells,
  weapons,
  type NewActualState,
  type NewArmor,
  type NewCharacter,
  type NewEffect,
  type NewSkill,
  type NewSpell,
  type NewWeapon,
} from '@/db/schema';
import {
  ARMOR_FIELDS,
  buildExport,
  CHARACTER_FIELDS,
  type CharacterBundle,
  EFFECT_FIELDS,
  type ProphecyExport,
  SKILL_FIELDS,
  SPELL_FIELDS,
  STATE_FIELDS,
  WEAPON_FIELDS,
} from '@/lib/character-transfer';

/** Copy only the listed keys off a DB row (drops id / FK / timestamps / media). */
function pick(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of fields) out[k] = row[k];
  return out;
}

/**
 * Gather one or more characters into a versioned export envelope. Pass character
 * ids to export a subset; omit for the whole roster (full backup). Media files
 * are not embedded — avatar/portrait paths are dropped (see character-transfer).
 */
export async function exportCharacters(ids?: number[]): Promise<ProphecyExport> {
  const rows = ids
    ? await db.select().from(characters).where(inArray(characters.id, ids))
    : await db.select().from(characters);

  const bundles: CharacterBundle[] = [];
  for (const c of rows) {
    const [st] = await db.select().from(actualState).where(eq(actualState.characterId, c.id));
    const [sk, ar, wp, sp, ef] = await Promise.all([
      db.select().from(skills).where(eq(skills.characterId, c.id)),
      db.select().from(armor).where(eq(armor.characterId, c.id)),
      db.select().from(weapons).where(eq(weapons.characterId, c.id)),
      db.select().from(spells).where(eq(spells.characterId, c.id)),
      db.select().from(effects).where(eq(effects.characterId, c.id)),
    ]);

    bundles.push({
      character: pick(c, CHARACTER_FIELDS),
      // A character always has a state row; fall back to an empty pick if not.
      state: pick(st ?? {}, STATE_FIELDS),
      skills: sk.map((r) => pick(r, SKILL_FIELDS)),
      armor: ar.map((r) => pick(r, ARMOR_FIELDS)),
      weapons: wp.map((r) => pick(r, WEAPON_FIELDS)),
      spells: sp.map((r) => pick(r, SPELL_FIELDS)),
      effects: ef.map((r) => pick(r, EFFECT_FIELDS)),
    } as CharacterBundle);
  }

  return buildExport(bundles);
}

/**
 * Insert every bundle as a BRAND-NEW character (fresh ids) — import never
 * overwrites an existing character, so re-importing simply duplicates. Returns
 * the number of characters created. Wrapped in a transaction so a bad bundle
 * can't leave a half-written character behind.
 *
 * The expo-sqlite driver runs transactions synchronously (it commits as soon as
 * the callback returns), so the body MUST use the sync query methods
 * (`.run()` / `.returning().get()`) — an async callback would commit before the
 * awaited writes ran. Hence this function is synchronous.
 */
export function importCharacters(data: ProphecyExport): number {
  let created = 0;
  db.transaction((tx) => {
    for (const b of data.characters) {
      const now = new Date();
      const row = tx
        .insert(characters)
        .values({ ...(b.character as Partial<NewCharacter>), createdAt: now, updatedAt: now })
        .returning()
        .get();
      const characterId = row.id;

      tx.insert(actualState)
        .values({ ...(b.state as Partial<NewActualState>), characterId })
        .run();

      const link = <T extends Record<string, unknown>>(rows: T[]) =>
        rows.map((r) => ({ ...r, characterId }));

      if (b.skills.length) tx.insert(skills).values(link(b.skills) as NewSkill[]).run();
      if (b.armor.length) tx.insert(armor).values(link(b.armor) as NewArmor[]).run();
      if (b.weapons.length) tx.insert(weapons).values(link(b.weapons) as NewWeapon[]).run();
      if (b.spells.length) tx.insert(spells).values(link(b.spells) as NewSpell[]).run();
      if (b.effects.length) tx.insert(effects).values(link(b.effects) as NewEffect[]).run();

      created += 1;
    }
  });
  return created;
}
