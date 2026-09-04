// Character export / import: a self-contained, versioned JSON envelope that
// carries one or more whole characters (sheet + live state + skills + armor +
// weapons + shields + items + spells + magic reserve objects + enchantments +
// avantages/désavantages + effects) between devices, or as a user backup.
//
// This module is PURE — no DB, no filesystem. The repository layer
// (`repositories/transfer`) gathers rows into bundles and re-inserts them; the
// UI reads/writes the file. That split keeps the validation logic unit-testable
// in plain Node.
//
// Media (avatar/portrait) is NOT included yet: those are files on disk, so an
// exported character loses its images. Documented limitation — a future version
// can base64-embed them.

import { z } from 'zod';

import {
  TIME_UNITS,
  MONEY,
  NUMERIC_KEYS,
  PERMANENT_UNIT,
  RESOURCES,
  SPHERES,
  TRAIT_KINDS,
  WOUND_LEVELS,
} from '@/constants/prophecy';
import { ENCHANT_TARGETS, type EnchantTarget } from '@/db/schema';
import { casteFromInput } from '@/lib/caste';

/** Bumped on any breaking change to the bundle shape. Import rejects mismatches. */
export const SCHEMA_VERSION = 1;
/** Envelope discriminator so we can tell our files from arbitrary JSON. */
export const EXPORT_FORMAT = 'prophecy-export';

const int = z.number().int();
const str = z.string();

// zod's enum wants a non-empty tuple, which `.map` can't prove.
const TRAIT_KIND_KEYS = TRAIT_KINDS.map((k) => k.key) as unknown as [string, ...string[]];

/** Build a `{ key: schema }` shape for a list of column keys. */
const shapeFrom = (keys: readonly string[], schema: z.ZodTypeAny) =>
  Object.fromEntries(keys.map((k) => [k, schema]));

// --- character (the sheet) — every numeric stat column + the free text ---
// Numeric columns are derived from NUMERIC_KEYS so this stays in sync with the
// schema instead of re-listing ~45 columns by hand.
const characterSchema = z.object({
  // Portable character id. OPTIONAL (not a version bump): older v1 exports have
  // no uuid and still import — a missing uuid is treated as a clone (new id) at
  // import time. New exports always carry it so a restore re-links the character
  // to its campaign roster slot. See `planImport` and docs/campaign-protocol.md.
  uuid: str.optional(),
  nom: str,
  concept: str,
  // Caste. OPTIONAL and nullable (not a version bump): exports made before the
  // column existed have no such field and import as « Sans Caste », the column
  // default. Parsed through `casteFromInput` so a hand-edited file written
  // « Érudit » still lands on the key instead of being dropped.
  caste: str.nullable().transform(casteFromInput).optional(),
  biographie: str,
  // PC vs NPC. OPTIONAL (not a version bump): exports made before the column
  // existed have no such field and import as a player character, the column
  // default. Carried so duplicating/restoring an NPC keeps it an NPC.
  kind: z.enum(['pc', 'npc']).optional(),
  ...shapeFrom(NUMERIC_KEYS, int),
});

// --- actual_state (live in-play values) ---
const CURRENT_KEYS: string[] = [
  ...WOUND_LEVELS.map((w) => `${w.key}Current`),
  ...RESOURCES.map((r) => `${r.key}Current`),
  'reserveMagiqueCurrent',
  ...SPHERES.map((s) => `${s.key}Current`),
];
const stateSchema = z.object({
  ...shapeFrom(CURRENT_KEYS, int),
  ...shapeFrom(
    MONEY.map((m) => m.key),
    int,
  ),
  initiativeValues: z.array(int),
  // Temporary initiative dice. OPTIONAL (not a version bump): exports made
  // before the column existed have no such key and import at the column default
  // 0. Signed — see the schema comment.
  initiativeBonusDice: int.optional(),
  // Per-die marks, index-aligned with initiativeValues. OPTIONAL for the same
  // reason as above: exports predating the column import at the default [].
  initiativeDiceIcons: z.array(str).optional(),
  conditions: str,
  notes: str,
  // Expérience (total awarded / total spent). OPTIONAL for the same reason as
  // the initiative keys above: exports predating the columns have no such key
  // and import at the column default 0.
  xpTotal: int.optional(),
  xpSpent: int.optional(),
});

const skillSchema = z.object({
  name: str,
  attribut: str,
  value: int,
  // Specialization link. Optional + nullable so pre-specialization exports (which
  // lack these keys) still import as plain base skills. null = base skill.
  parentName: str.nullable().optional(),
  specLabel: str.nullable().optional(),
});

const armorSchema = z.object({
  name: str,
  defenseMax: int,
  defenseCurrent: int,
  equipped: z.boolean(),
  // Category/prerequisites/creation/special/encombrement. OPTIONAL (not a
  // version bump, like `cleParfaite`): exports made before these columns
  // existed have no such fields and still import — each falls back to its
  // column default (see repositories/transfer.ts, which omits absent keys
  // from the insert so SQLite's own default applies).
  category: str.optional(),
  prerequisites: str.optional(),
  creationDifficulty: int.optional(),
  creationTime: z.number().optional(),
  special: str.optional(),
  encombrementMalus: int.optional(),
});

const shieldSchema = z.object({
  name: str,
  damage: str,
  prerequisites: str,
  creationDifficulty: int,
  creationTime: z.number(),
  special: str,
  defenseMax: int,
  defenseCurrent: int,
  encombrementMalus: int,
  equipped: z.boolean(),
});

const weaponSchema = z.object({
  name: str,
  damage: str,
  prerequisites: str,
  creationDifficulty: int,
  // Fractional: some weapons take half a day to craft. Accepts the whole numbers
  // older exports carry, so no version bump.
  creationTime: z.number(),
  initMelee: int,
  initCorpsACorps: int,
  special: str,
  rangeEffective: str.nullable(),
  rangeMax: str.nullable(),
  hands: int,
  equippedHand: str.nullable(),
  // The compétence the weapon is wielded with. OPTIONAL (not a version bump,
  // like armor's `category`): exports made before the column existed have no
  // such field, and the weapon imports with no skill linked — the same
  // « Compétence non définie » state a hand-made weapon starts in.
  skillName: str.nullable().optional(),
});

const UNIT_KEYS = TIME_UNITS.map((u) => u.key) as [string, ...string[]];
const spellSchema = z.object({
  name: str,
  // Niveau. OPTIONAL (not a version bump, like `cleParfaite`): exports made
  // before the column existed have no such field and still import — missing
  // falls back to the column default (1).
  level: int.optional(),
  complexity: int,
  discipline: str,
  sphere: str,
  // Draconic restriction — reserved to the mage of this sphère's own dragon.
  // OPTIONAL, same reasoning as `level`: exports predating the column carry
  // none, and `false` — a spell the whole sphère may cast — is the default.
  dragonOnly: z.boolean().optional(),
  cost: int,
  castTimeAmount: int,
  castTimeUnit: z.enum(UNIT_KEYS),
  difficulty: int,
  cle: str,
  // Perfect key. OPTIONAL (not a version bump, like `uuid`): exports made before
  // the column existed have no such field and still import — missing falls back
  // to the column default (false).
  cleParfaite: z.boolean().optional(),
  effect: str,
  // The convenience layer extracted from `effect`. ALL OPTIONAL, same reasoning
  // as `level` above: exports predating these columns carry none, and a spell
  // with none renders from `effect` alone. `durationUnit` is only meaningful
  // next to a `duration`, so it falls back to the column default when absent.
  inGameEffect: str.optional(),
  sensoryEffect: str.optional(),
  duration: str.optional(),
  durationUnit: z.enum(UNIT_KEYS).optional(),
  targets: str.optional(),
  tags: z.array(str).optional(),
  // Which catalogue entry the spell was picked from, and at which revision.
  // Both nullable/optional, and carried on BOTH export intents: a round-trip
  // through a file must not turn a catalogue spell into a hand-made one, which
  // is exactly what dropping them would do — irreversibly, since nothing
  // downstream can tell the two apart afterwards. Unlike `uuid` there is no
  // sharing concern: a preset slug identifies a rulebook entry, not a device.
  presetId: str.nullable().optional(),
  presetRevision: str.nullable().optional(),
  // Part of the character's own repertoire, or only an enchantment's source?
  // OPTIONAL (not a version bump, like `level`): every row that predates the
  // column was a spell the character knew, which is the default.
  known: z.boolean().optional(),
});

// Inventory. OPTIONAL with a `[]` default (not a version bump, like `shields`):
// items were simply missing from the bundle until enchantments needed something
// to be bound to, and older files carry none.
const itemSchema = z.object({
  name: str,
  description: str,
  quantity: int,
  equipped: z.boolean(),
});

/**
 * An enchantment, and the one thing that makes it awkward to carry: it points at
 * a piece of gear and (sometimes) at a spell, and NEITHER id survives a file.
 * Child rows are exported as plain arrays and re-inserted with fresh ids, so the
 * link travels as a POSITION in the matching array of this same bundle —
 * `targetIndex` into weapons/armor/shields/items per `targetType`,
 * `sourceSpellIndex` into spells.
 *
 * An index and not a portable uuid on every gear row: the bundle is
 * self-contained and its arrays are re-inserted in order, so a position resolves
 * exactly, while uuids would mean four more columns, a backfill, and a minting
 * rule at every place gear is created or duplicated. If a cross-file link is
 * ever needed, a `targetUuid` can join this shape as an optional field without
 * invalidating a single existing export.
 *
 * An index that no longer resolves (a hand-edited file) drops the enchant rather
 * than binding it to the wrong sword.
 */
const enchantSchema = z.object({
  targetType: z.enum(ENCHANT_TARGETS),
  targetIndex: int,
  name: str,
  effect: str,
  usesMax: int,
  usesCurrent: int,
  sourceSpellName: str.nullable().optional(),
  sourceSpellIndex: int.nullable().optional(),
  // The enchanter's roll and what it was rolled against. Nullable: an enchant
  // with no recorded numbers is a normal state (see the `enchants` schema).
  castScore: int.nullable().optional(),
  difficulty: int.nullable().optional(),
});

// Magic reserve objects. OPTIONAL with a `[]` default (not a version bump, like
// the spell `level`): exports made before the table existed simply carry none.
const magicReserveSchema = z.object({
  nom: str,
  max: int,
  current: int,
});

// An effect may also be permanent — a unit spells never have, which is why this
// is not plain `UNIT_KEYS`.
const EFFECT_DURATION_UNITS = [...UNIT_KEYS, PERMANENT_UNIT] as [string, ...string[]];

// Avantages / désavantages. OPTIONAL with a `[]` default (not a version bump,
// like `items` and `shields`): exports made before the table existed carry none.
//
// `kind` is the only strict field — it decides which side of the point pool the
// cost lands on, so an unknown value cannot be defaulted into one half without
// silently rewriting the character's balance. `rarity` is deliberately loose
// (plain string, like `effects.durationUnit`): it is a badge, and a heading this
// version doesn't know about must not cost the player the whole trait.
const traitSchema = z.object({
  kind: z.enum(TRAIT_KIND_KEYS),
  name: str,
  rarity: str,
  cost: int,
  description: str,
  // The mechanical summary. OPTIONAL (not a version bump, like a spell's
  // `inGameEffect`): exports predating the column carry none, and an entry
  // without one renders its paragraph alone.
  inGameEffect: str.optional(),
  note: str,
  // Provenance, carried on BOTH export intents for the same reason as a spell's:
  // a round trip through a file must not turn a catalogue entry into a hand
  // written one, and nothing downstream could tell afterwards.
  presetId: str.nullable().optional(),
  presetRevision: str.nullable().optional(),
});

const effectSchema = z.object({
  label: str,
  target: str,
  value: int,
  durationUnit: z.enum(EFFECT_DURATION_UNITS),
  durationRemaining: int,
  expired: z.boolean(),
});

const characterBundleSchema = z.object({
  character: characterSchema,
  state: stateSchema,
  skills: z.array(skillSchema),
  armor: z.array(armorSchema),
  weapons: z.array(weaponSchema),
  // OPTIONAL with a `[]` default (not a version bump, like `magicReserves`):
  // exports made before the table existed simply carry none.
  shields: z.array(shieldSchema).default([]),
  items: z.array(itemSchema).default([]),
  spells: z.array(spellSchema),
  magicReserves: z.array(magicReserveSchema).default([]),
  enchants: z.array(enchantSchema).default([]),
  traits: z.array(traitSchema).default([]),
  effects: z.array(effectSchema),
});

const exportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: str,
  characters: z.array(characterBundleSchema),
});

export type CharacterBundle = z.infer<typeof characterBundleSchema>;
export type ProphecyExport = z.infer<typeof exportSchema>;

// Column key lists, derived from the schemas so the repository picks exactly the
// exportable fields (no id / FK / timestamp / media leakage) from a full DB row.
export const CHARACTER_FIELDS = Object.keys(characterSchema.shape);
export const STATE_FIELDS = Object.keys(stateSchema.shape);
export const SKILL_FIELDS = Object.keys(skillSchema.shape);
export const ARMOR_FIELDS = Object.keys(armorSchema.shape);
export const WEAPON_FIELDS = Object.keys(weaponSchema.shape);
export const SHIELD_FIELDS = Object.keys(shieldSchema.shape);
/**
 * Export side: an enchant's live row ids → the positions a file carries.
 *
 * Returns null when the target no longer resolves — an enchant bound to a
 * deleted object has nothing to point at on the far side, and a bundle is only
 * self-contained if every link in it resolves.
 *
 * A missing SOURCE is not the same thing: a spell can vanish out from under an
 * enchant (`sourceSpellId` is `on delete set null`) while the enchant stays
 * perfectly meaningful — `sourceSpellName` and `effect` are its frozen history.
 * So an unresolvable source degrades to null; an unresolvable target drops.
 */
export function linkEnchant(
  row: { targetType: EnchantTarget; targetId: number; sourceSpellId: number | null },
  gearIndex: Record<EnchantTarget, Map<number, number>>,
  spellIndex: Map<number, number>,
): { targetIndex: number; sourceSpellIndex: number | null } | null {
  const targetIndex = gearIndex[row.targetType]?.get(row.targetId);
  if (targetIndex == null) return null;
  return {
    targetIndex,
    sourceSpellIndex: row.sourceSpellId == null ? null : (spellIndex.get(row.sourceSpellId) ?? null),
  };
}

/**
 * Import side: the positions back into the ids just written. Mirror of
 * {@link linkEnchant}, and it drops on the same rule — an index pointing past
 * the end of the array (a hand-edited file, or a bundle whose gear was trimmed)
 * binds the enchant to NOTHING rather than to whatever sits at that position.
 */
export function resolveEnchantLinks(
  e: { targetType: string; targetIndex: number; sourceSpellIndex?: number | null },
  gearIds: Partial<Record<EnchantTarget, number[]>>,
  spellIds: number[],
): { targetId: number; sourceSpellId: number | null } | null {
  const targetId = gearIds[e.targetType as EnchantTarget]?.[e.targetIndex];
  if (targetId == null) return null;
  return {
    targetId,
    sourceSpellId: e.sourceSpellIndex == null ? null : (spellIds[e.sourceSpellIndex] ?? null),
  };
}

export const ITEM_FIELDS = Object.keys(itemSchema.shape);
export const SPELL_FIELDS = Object.keys(spellSchema.shape);
/**
 * The enchant COLUMNS only — `targetIndex`/`sourceSpellIndex` are computed from
 * the sibling arrays at export time, so they can't be picked off a row.
 */
export const ENCHANT_FIELDS = [
  'targetType',
  'name',
  'effect',
  'usesMax',
  'usesCurrent',
  'sourceSpellName',
  'castScore',
  'difficulty',
];
export const MAGIC_RESERVE_FIELDS = Object.keys(magicReserveSchema.shape);
export const TRAIT_FIELDS = Object.keys(traitSchema.shape);
export const EFFECT_FIELDS = Object.keys(effectSchema.shape);

export type ImportResult =
  | { ok: true; data: ProphecyExport }
  | { ok: false; error: string };

/** Wrap prepared bundles in the versioned envelope. `now` is injectable for tests. */
export function buildExport(
  characters: CharacterBundle[],
  now: Date = new Date(),
): ProphecyExport {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    characters,
  };
}

/** Pretty-print an export for writing to a `.json` file. */
export function serializeExport(exp: ProphecyExport): string {
  return JSON.stringify(exp, null, 2);
}

/**
 * Parse + validate a raw file string into an export. Returns a discriminated
 * result with a French, user-facing error rather than throwing — the UI shows
 * `error` directly. Format and version are checked first so a wrong-file or
 * wrong-version gets a precise message instead of a generic schema dump.
 */
export function parseImport(raw: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Fichier illisible : JSON invalide.' };
  }

  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, error: 'Format non reconnu.' };
  }
  const obj = json as Record<string, unknown>;
  if (obj.format !== EXPORT_FORMAT) {
    return { ok: false, error: 'Ce fichier n’est pas un export Prophecy.' };
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Version d’export non prise en charge (${String(obj.schemaVersion)}). Attendu : ${SCHEMA_VERSION}.`,
    };
  }

  const parsed = exportSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: 'Fichier d’export corrompu ou incomplet.' };
  }
  return { ok: true, data: parsed.data };
}

// --- Import intent: restore vs clone (see docs/campaign-protocol.md §3) ---------
//
// The same file can be imported with two opposite intents:
//   - restore  → keep the character's identity (uuid) so it re-links to its
//                campaign roster slot and GM notes. Same phone that already holds
//                it ⇒ replace in place (idempotent); a fresh phone ⇒ insert as-is.
//   - copy     → a new lineage (freshly minted uuid), so giving a character to
//                another player never hijacks the original's roster slot.
// A legacy export with no uuid is always a copy.

export type ImportMode = 'restore' | 'copy';
export type ImportAction = 'insert' | 'replace';
export interface ImportPlan {
  uuid: string;
  action: ImportAction;
}

/**
 * What an export is FOR (issue #43). The two intents differ by one thing — the
 * portable `uuid` — but the consequence is large:
 *
 *   - `backup` keeps it, so re-importing the file restores THE character: same
 *     campaign roster slot, same GM notes, replaced in place instead of doubled.
 *   - `share` strips it, so the receiving player gets a NEW lineage. Handing a
 *     sheet to a friend must never hand over the identity too: two devices
 *     broadcasting one uuid collapse onto a single roster row, overwrite each
 *     other's projection, and one player's `unshare` purges the other's.
 *
 * The intent therefore has to be decided when the file is WRITTEN — an importer
 * cannot tell "my own backup" from "a copy someone sent me", and guessing wrong
 * is exactly the collision above.
 */
export type ExportIntent = 'backup' | 'share';

/**
 * Strip the portable identity off an export, making it a shareable copy. Pure:
 * returns a new envelope, leaves the input alone. A bundle with no uuid (legacy
 * file) is already share-shaped and passes through.
 */
export function forSharing(exp: ProphecyExport): ProphecyExport {
  return {
    ...exp,
    characters: exp.characters.map((b) => {
      const { uuid: _uuid, ...character } = b.character as { uuid?: string };
      return { ...b, character } as CharacterBundle;
    }),
  };
}

/**
 * Filename for an export, so the two intents are tellable apart in a Files app
 * six months later — the envelopes look identical from the outside, and picking
 * the wrong one back is exactly the mistake `ExportIntent` exists to prevent.
 * A single-character share is named after the character (that is how it will be
 * talked about: "je t'envoie Ryld"); a batch is named by its count.
 *
 * Pure, and the character name is slugified rather than used raw: it is user
 * text landing in a filesystem path.
 */
export function exportFileName(
  exp: ProphecyExport,
  intent: ExportIntent,
  now: Date = new Date(),
): string {
  const stamp = now.toISOString().slice(0, 10);
  const kind = intent === 'share' ? 'partage' : 'sauvegarde';
  const chars = exp.characters;
  const subject =
    chars.length === 1
      ? slug(String((chars[0].character as { nom?: string }).nom ?? '')) || 'personnage'
      : `${chars.length}-personnages`;
  return `prophecy-${kind}-${subject}-${stamp}.json`;
}

/** Accent-free, lowercase, filesystem-safe, capped. Empty when nothing survives. */
function slug(s: string): string {
  return s
    .normalize('NFD')
    // Combining marks, escaped rather than literal — invisible characters in a
    // regex are a trap for the next reader (and for a careless editor).
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/, '');
}

/**
 * The mode that actually applies to ONE bundle. A `restore` import is only a
 * restore for the bundles that carry an identity: a shared file (uuid stripped)
 * read back under `'restore'` is still a copy, and must be treated as one all
 * the way down — including its magic reserves, which recharge on a copy.
 */
export function bundleMode(incomingUuid: string | undefined, mode: ImportMode): ImportMode {
  return mode === 'restore' && incomingUuid ? 'restore' : 'copy';
}

/**
 * Decide the uuid + write action for one incoming character. Pure — `mintUuid`
 * is injected so the caller (and tests) control id generation.
 */
export function planImport(
  incomingUuid: string | undefined,
  existingUuids: ReadonlySet<string>,
  mode: ImportMode,
  mintUuid: () => string,
): ImportPlan {
  if (mode === 'copy' || !incomingUuid) return { uuid: mintUuid(), action: 'insert' };
  return existingUuids.has(incomingUuid)
    ? { uuid: incomingUuid, action: 'replace' }
    : { uuid: incomingUuid, action: 'insert' };
}

/**
 * Magic reserve objects on import. A `restore` is the same character coming
 * back, so its objects keep the puces they had spent. A `copy` is a NEW
 * character (duplicate, or a sheet handed to another player), so each object
 * comes back fully charged — same rule as a freshly created one — instead of
 * inheriting a mid-session drain that belongs to the original's play.
 */
export function planMagicReserves<T extends { max: number; current: number }>(
  rows: readonly T[],
  mode: ImportMode,
): T[] {
  return mode === 'copy' ? rows.map((r) => ({ ...r, current: r.max })) : [...rows];
}
