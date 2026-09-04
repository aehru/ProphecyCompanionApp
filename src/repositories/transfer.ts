import { asc, eq, inArray } from 'drizzle-orm';

import { db, transaction } from '@/db/client';
import {
  actualState,
  armor,
  characters,
  effects,
  enchants,
  items,
  magicReserves,
  shields,
  skills,
  spells,
  weapons,
  type EnchantTarget,
  type NewActualState,
  type NewArmor,
  type NewCharacter,
  type NewEffect,
  type NewEnchant,
  type NewItem,
  type NewMagicReserve,
  type NewShield,
  type NewSkill,
  type NewSpell,
  type NewWeapon,
} from '@/db/schema';
import {
  ARMOR_FIELDS,
  buildExport,
  bundleMode,
  CHARACTER_FIELDS,
  type CharacterBundle,
  EFFECT_FIELDS,
  ENCHANT_FIELDS,
  type ExportIntent,
  forSharing,
  type ImportMode,
  ITEM_FIELDS,
  linkEnchant,
  MAGIC_RESERVE_FIELDS,
  planImport,
  planMagicReserves,
  type ProphecyExport,
  resolveEnchantLinks,
  SHIELD_FIELDS,
  SKILL_FIELDS,
  SPELL_FIELDS,
  STATE_FIELDS,
  WEAPON_FIELDS,
} from '@/lib/character-transfer';
import { copyMedia } from '@/lib/media';
import { newUuid } from '@/lib/uuid';
import { logWrite } from '@/repositories/log';

/**
 * The four tables an enchant can be bound to, keyed the way the row stores it.
 * A polymorphic pointer has no FK to follow, so the mapping has to be written
 * down somewhere — here, once, rather than as a switch at each use.
 */
const GEAR_TABLES = { weapon: weapons, armor, shield: shields, item: items } as const;
type GearTable = (typeof GEAR_TABLES)[EnchantTarget] | typeof spells;

/** Row id → its position in the array, the form a link takes inside a bundle. */
function positions(rows: { id: number }[]): Map<number, number> {
  return new Map(rows.map((r, i) => [r.id, i]));
}

/**
 * Bucket child rows by their character, PRESERVING the order they arrived in.
 *
 * That order is load-bearing: an enchant's target and its source spell ride
 * along as positions into these arrays, so the sibling lists must come out
 * exactly as `asc(id)` produced them. Grouping a single ordered result set keeps
 * each character's rows in their relative order, which is the same sequence a
 * per-character `WHERE characterId = ? ORDER BY id` would have given.
 */
function byCharacter<T extends { characterId: number }>(rows: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const list = map.get(row.characterId);
    if (list) list.push(row);
    else map.set(row.characterId, [row]);
  }
  return map;
}

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
 *
 * `intent` decides whether the portable `uuid` rides along (see `ExportIntent`):
 * a backup keeps the characters' identity, a share strips it so the recipient
 * gets a new lineage instead of a second claim on the same campaign roster slot.
 */
export async function exportCharacters(
  ids?: number[],
  intent: ExportIntent = 'backup',
): Promise<ProphecyExport> {
  // An EMPTY id list is not "everything": `inArray(id, [])` is invalid SQL, and
  // `undefined` is the only thing that means the whole roster. Same guard
  // `sharedCharacterNames` and `useCharacterProjections` already carry.
  const rows =
    ids === undefined
      ? await db.select().from(characters)
      : ids.length === 0
        ? []
        : await db.select().from(characters).where(inArray(characters.id, ids));

  if (rows.length === 0) {
    logWrite('characters', 'update', { count: 0, phase: 'export', mode: intent });
    const empty = buildExport([]);
    return intent === 'share' ? forSharing(empty) : empty;
  }

  // TEN queries for the whole envelope, not ten PER CHARACTER. Every statement
  // takes its turn in the client's queue (see db/client), so a full backup used
  // to be `10 × N` serialized round-trips — 500 of them for fifty characters,
  // each prepared and finalized on its own.
  //
  // Ordered by id, all of them: an enchant's target and its source spell ride
  // along as POSITIONS in these arrays (see `enchantSchema`), so export and
  // import have to agree on the order — `asc(id)` is that agreement, and it is
  // the order the importer re-inserts in. Bucketing one ordered result set per
  // character preserves it exactly (see `byCharacter`).
  const charIds = rows.map((c) => c.id);
  const [stateRows, skillRows, armorRows, weaponRows, shieldRows, itemRows, spellRows, reserveRows, enchantRows, effectRows] =
    await Promise.all([
      db.select().from(actualState).where(inArray(actualState.characterId, charIds)),
      db.select().from(skills).where(inArray(skills.characterId, charIds)).orderBy(asc(skills.id)),
      db.select().from(armor).where(inArray(armor.characterId, charIds)).orderBy(asc(armor.id)),
      db.select().from(weapons).where(inArray(weapons.characterId, charIds)).orderBy(asc(weapons.id)),
      db.select().from(shields).where(inArray(shields.characterId, charIds)).orderBy(asc(shields.id)),
      db.select().from(items).where(inArray(items.characterId, charIds)).orderBy(asc(items.id)),
      db.select().from(spells).where(inArray(spells.characterId, charIds)).orderBy(asc(spells.id)),
      db
        .select()
        .from(magicReserves)
        .where(inArray(magicReserves.characterId, charIds))
        .orderBy(asc(magicReserves.id)),
      db.select().from(enchants).where(inArray(enchants.characterId, charIds)).orderBy(asc(enchants.id)),
      db.select().from(effects).where(inArray(effects.characterId, charIds)).orderBy(asc(effects.id)),
    ]);

  const stateByChar = new Map(stateRows.map((s) => [s.characterId, s]));
  const skillsByChar = byCharacter(skillRows);
  const armorByChar = byCharacter(armorRows);
  const weaponsByChar = byCharacter(weaponRows);
  const shieldsByChar = byCharacter(shieldRows);
  const itemsByChar = byCharacter(itemRows);
  const spellsByChar = byCharacter(spellRows);
  const reservesByChar = byCharacter(reserveRows);
  const enchantsByChar = byCharacter(enchantRows);
  const effectsByChar = byCharacter(effectRows);

  const bundles: CharacterBundle[] = [];
  for (const c of rows) {
    const st = stateByChar.get(c.id);
    const sk = skillsByChar.get(c.id) ?? [];
    const ar = armorByChar.get(c.id) ?? [];
    const wp = weaponsByChar.get(c.id) ?? [];
    const sh = shieldsByChar.get(c.id) ?? [];
    const it = itemsByChar.get(c.id) ?? [];
    const sp = spellsByChar.get(c.id) ?? [];
    const mr = reservesByChar.get(c.id) ?? [];
    const en = enchantsByChar.get(c.id) ?? [];
    const ef = effectsByChar.get(c.id) ?? [];

    const gearIndex: Record<EnchantTarget, Map<number, number>> = {
      weapon: positions(wp),
      armor: positions(ar),
      shield: positions(sh),
      item: positions(it),
    };
    const spellIndex = positions(sp);

    bundles.push({
      character: pick(c, CHARACTER_FIELDS),
      // A character always has a state row; fall back to an empty pick if not.
      state: pick(st ?? {}, STATE_FIELDS),
      skills: sk.map((r) => pick(r, SKILL_FIELDS)),
      armor: ar.map((r) => pick(r, ARMOR_FIELDS)),
      weapons: wp.map((r) => pick(r, WEAPON_FIELDS)),
      shields: sh.map((r) => pick(r, SHIELD_FIELDS)),
      items: it.map((r) => pick(r, ITEM_FIELDS)),
      spells: sp.map((r) => pick(r, SPELL_FIELDS)),
      magicReserves: mr.map((r) => pick(r, MAGIC_RESERVE_FIELDS)),
      // An enchant whose target vanished has nothing to be bound to on the far
      // side, so it is dropped rather than exported dangling.
      enchants: en.flatMap((r) => {
        const links = linkEnchant(r, gearIndex, spellIndex);
        return links ? [{ ...pick(r, ENCHANT_FIELDS), ...links }] : [];
      }),
      effects: ef.map((r) => pick(r, EFFECT_FIELDS)),
    } as CharacterBundle);
  }

  logWrite('characters', 'update', { count: bundles.length, phase: 'export', mode: intent });
  const exp = buildExport(bundles);
  return intent === 'share' ? forSharing(exp) : exp;
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
 * The mode is per FILE but the decision is per BUNDLE (`bundleMode`): a shared
 * export carries no uuid, so it stays a copy even when the caller asked for a
 * restore — which is what lets the import screen pass `'restore'` blindly and
 * let the file's own shape decide.
 *
 * Returns the row ids written (inserted or replaced) in bundle order, plus how
 * many of those replaced a character this device already had — the import screen
 * reports "restaurés" vs "ajoutés" from it. Wrapped in a transaction so a bad
 * bundle can't leave a half-written character behind.
 */
export interface ImportOutcome {
  /** Row ids written, in bundle order. */
  ids: number[];
  /** How many of them replaced a character this device already held. */
  restored: number;
}

export async function importCharacters(
  data: ProphecyExport,
  mode: ImportMode = 'copy',
): Promise<ImportOutcome> {
  const written: number[] = [];
  let restored = 0;
  await transaction(async (tx) => {
    // Seed the live uuid set once, then keep it current as we write, so two
    // bundles carrying the same uuid in one file don't both try to insert it.
    const existing = new Set(
      (await tx.select({ uuid: characters.uuid }).from(characters))
        .map((r) => r.uuid)
        .filter((u): u is string => u != null),
    );

    for (const b of data.characters) {
      const now = new Date();
      const incoming = (b.character as { uuid?: string }).uuid;
      // A uuid-less bundle (a shared sheet) is a copy whatever the file mode.
      const effective = bundleMode(incoming, mode);
      const plan = planImport(incoming, existing, effective, newUuid);
      // The bundle's own uuid never wins directly — the plan decides it.
      const sheet = { ...(b.character as Partial<NewCharacter>), uuid: plan.uuid };

      let characterId: number;
      if (plan.action === 'replace') {
        const target = await tx
          .select({ id: characters.id })
          .from(characters)
          .where(eq(characters.uuid, plan.uuid))
          .get();
        // Fall back to insert if the row vanished between planning and now.
        if (!target) {
          characterId = (
            await tx
              .insert(characters)
              .values({ ...sheet, createdAt: now, updatedAt: now })
              .returning()
              .get()
          ).id;
        } else {
          characterId = target.id;
          restored++;
          // Overwrite the sheet (keep original createdAt) and rebuild children.
          await tx.update(characters).set({ ...sheet, updatedAt: now }).where(eq(characters.id, characterId));
          for (const t of [
            actualState,
            skills,
            armor,
            weapons,
            shields,
            items,
            // Before `spells`: `sourceSpellId` is the one REAL foreign key here
            // (`on delete set null`), so dropping the spells first would make
            // SQLite rewrite every enchant row a statement before deleting it.
            enchants,
            spells,
            magicReserves,
            effects,
          ]) {
            await tx.delete(t).where(eq(t.characterId, characterId));
          }
        }
      } else {
        characterId = (
          await tx
            .insert(characters)
            .values({ ...sheet, createdAt: now, updatedAt: now })
            .returning()
            .get()
        ).id;
      }

      await tx.insert(actualState).values({ ...(b.state as Partial<NewActualState>), characterId });

      const link = <T extends Record<string, unknown>>(rows: T[]) =>
        rows.map((r) => ({ ...r, characterId }));

      if (b.skills.length) await tx.insert(skills).values(link(b.skills) as NewSkill[]);
      if (b.armor.length) await tx.insert(armor).values(link(b.armor) as NewArmor[]);
      if (b.weapons.length) await tx.insert(weapons).values(link(b.weapons) as NewWeapon[]);
      const shieldRows = b.shields ?? [];
      if (shieldRows.length) await tx.insert(shields).values(link(shieldRows) as NewShield[]);
      const itemRows = b.items ?? [];
      if (itemRows.length) await tx.insert(items).values(link(itemRows) as NewItem[]);
      if (b.spells.length) await tx.insert(spells).values(link(b.spells) as NewSpell[]);
      // Reserve objects are recharged on a copy, kept as-is on a restore.
      const reserves = planMagicReserves(b.magicReserves ?? [], effective);
      if (reserves.length) {
        await tx.insert(magicReserves).values(link(reserves) as NewMagicReserve[]);
      }
      if (b.effects.length) await tx.insert(effects).values(link(b.effects) as NewEffect[]);

      // Enchants LAST: their target and their source spell travelled as
      // positions in the arrays just written (see `enchantSchema`), so the fresh
      // ids only exist now. Read back in insertion order — `asc(id)` on an
      // autoincrement key IS that order, and it is the order they were exported
      // in. An index that resolves to nothing (a hand-edited file) drops the
      // enchant instead of binding it to whatever sits at that position.
      const enchantRows = b.enchants ?? [];
      if (enchantRows.length) {
        const newIds = async (t: GearTable) =>
          (
            await tx
              .select({ id: t.id })
              .from(t)
              .where(eq(t.characterId, characterId))
              .orderBy(asc(t.id))
          ).map((r) => r.id);
        // Only the kinds actually pointed at: an enchanted sword costs one
        // read-back, not four, and a bundle with no linked sortilège costs none.
        const gearIds: Partial<Record<EnchantTarget, number[]>> = {};
        for (const kind of new Set(enchantRows.map((e) => e.targetType as EnchantTarget))) {
          gearIds[kind] = await newIds(GEAR_TABLES[kind]);
        }
        const spellIds = enchantRows.some((e) => e.sourceSpellIndex != null)
          ? await newIds(spells)
          : [];

        const rows = enchantRows.flatMap((e) => {
          const links = resolveEnchantLinks(e, gearIds, spellIds);
          if (!links) return [];
          const { targetIndex: _t, sourceSpellIndex: _s, ...cols } = e;
          return [{ ...cols, characterId, ...links }];
        });
        if (rows.length) await tx.insert(enchants).values(rows as NewEnchant[]);
      }

      existing.add(plan.uuid);
      written.push(characterId);
    }
  });
  logWrite('characters', 'insert', {
    ids: written,
    count: written.length,
    restored,
    mode,
    phase: 'import',
  });
  return { ids: written, restored };
}

/**
 * Duplicate one character locally (issue #59): a full deep copy — sheet, live
 * state (wounds included), skills, armor, weapons, shields, spells, magic
 * reserve objects (recharged full, see `planMagicReserves`), effects — under a
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

  const [newId] = (await importCharacters(exp, 'copy')).ids;

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

  logWrite('characters', 'insert', { characterId: newId, id, reason: 'duplicate' });
  return newId;
}

/**
 * Duplicate several characters (list selection mode). Sequential on purpose:
 * `duplicateCharacter` writes in its own transaction and copies media files, and
 * the uuid set is re-read per call — running them in parallel would race.
 * Returns the new row ids, skipping any id that no longer exists.
 */
export async function duplicateCharacters(ids: readonly number[]): Promise<number[]> {
  const created: number[] = [];
  for (const id of ids) {
    const newId = await duplicateCharacter(id);
    if (newId != null) created.push(newId);
  }
  return created;
}
