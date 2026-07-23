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
  type ImportMode,
  planImport,
  type ProphecyExport,
  SKILL_FIELDS,
  SPELL_FIELDS,
  STATE_FIELDS,
  WEAPON_FIELDS,
} from '@/lib/character-transfer';
import { copyMedia } from '@/lib/media';
import { newUuid } from '@/lib/uuid';

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
 * Import bundles into the local DB. `mode` decides identity handling (see
 * `planImport` / docs/campaign-protocol.md §3):
 *   - `'copy'`    (default) — every bundle becomes a BRAND-NEW character with a
 *     freshly minted uuid. Matches the historical "re-import duplicates" and the
 *     "share with another player" intent.
 *   - `'restore'` — preserve each character's uuid so it re-links to its campaign
 *     roster slot. A uuid this device already holds is REPLACED in place
 *     (idempotent re-import); an unknown uuid is inserted as-is.
 * Returns the row ids of the characters written (inserted or replaced), in
 * bundle order. Wrapped in a transaction so a bad bundle can't leave a
 * half-written character behind.
 *
 * The expo-sqlite driver runs transactions synchronously (it commits as soon as
 * the callback returns), so the body MUST use the sync query methods
 * (`.run()` / `.returning().get()` / `.all()`) — an async callback would commit
 * before the awaited writes ran. Hence this function is synchronous.
 */
export function importCharacters(data: ProphecyExport, mode: ImportMode = 'copy'): number[] {
  const written: number[] = [];
  db.transaction((tx) => {
    // Seed the live uuid set once, then keep it current as we write, so two
    // bundles carrying the same uuid in one file don't both try to insert it.
    const existing = new Set(
      tx
        .select({ uuid: characters.uuid })
        .from(characters)
        .all()
        .map((r) => r.uuid)
        .filter((u): u is string => u != null),
    );

    for (const b of data.characters) {
      const now = new Date();
      const incoming = (b.character as { uuid?: string }).uuid;
      const plan = planImport(incoming, existing, mode, newUuid);
      // The bundle's own uuid never wins directly — the plan decides it.
      const sheet = { ...(b.character as Partial<NewCharacter>), uuid: plan.uuid };

      let characterId: number;
      if (plan.action === 'replace') {
        const target = tx
          .select({ id: characters.id })
          .from(characters)
          .where(eq(characters.uuid, plan.uuid))
          .get();
        // Fall back to insert if the row vanished between planning and now.
        if (!target) {
          characterId = tx
            .insert(characters)
            .values({ ...sheet, createdAt: now, updatedAt: now })
            .returning()
            .get().id;
        } else {
          characterId = target.id;
          // Overwrite the sheet (keep original createdAt) and rebuild children.
          tx.update(characters).set({ ...sheet, updatedAt: now }).where(eq(characters.id, characterId)).run();
          for (const t of [actualState, skills, armor, weapons, spells, effects]) {
            tx.delete(t).where(eq(t.characterId, characterId)).run();
          }
        }
      } else {
        characterId = tx
          .insert(characters)
          .values({ ...sheet, createdAt: now, updatedAt: now })
          .returning()
          .get().id;
      }

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

      existing.add(plan.uuid);
      written.push(characterId);
    }
  });
  return written;
}

/**
 * Duplicate one character locally (issue #59): a full deep copy — sheet, live
 * state (wounds included), skills, armor, weapons, spells, effects — under a
 * freshly minted uuid, so the copy is a new lineage that never collides with the
 * original in a campaign roster. Rides the export→import pipeline in `'copy'`
 * mode instead of re-walking the tables by hand; the transfer field lists drop
 * media paths, so avatar/portrait files are then copied on disk into the new
 * character's folder. Returns the new character's row id, or null if `id`
 * doesn't exist.
 */
export async function duplicateCharacter(id: number): Promise<number | null> {
  const exp = await exportCharacters([id]);
  const bundle = exp.characters[0];
  if (!bundle) return null;

  // Suffix the name so the two rows are tellable apart in the list.
  const sheet = bundle.character as { nom?: string };
  sheet.nom = `${sheet.nom || 'Sans nom'} (copie)`;

  const [newId] = importCharacters(exp, 'copy');

  // Media: copy the files (not just the paths — each character owns its folder,
  // and deleting one character removes its whole media dir).
  const src = await db
    .select({ avatarPath: characters.avatarPath, portraitPath: characters.portraitPath })
    .from(characters)
    .where(eq(characters.id, id));
  const media = {
    avatarPath: copyMedia(src[0]?.avatarPath, newId),
    portraitPath: copyMedia(src[0]?.portraitPath, newId),
  };
  if (media.avatarPath || media.portraitPath) {
    await db.update(characters).set(media).where(eq(characters.id, newId));
  }

  return newId;
}
