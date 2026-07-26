// Character export / import: a self-contained, versioned JSON envelope that
// carries one or more whole characters (sheet + live state + skills + armor +
// weapons + spells + magic reserve objects + effects) between devices, or as a
// user backup.
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
  EFFECT_UNITS,
  MONEY,
  NUMERIC_KEYS,
  RESOURCES,
  SPHERES,
  WOUND_LEVELS,
} from '@/constants/prophecy';

/** Bumped on any breaking change to the bundle shape. Import rejects mismatches. */
export const SCHEMA_VERSION = 1;
/** Envelope discriminator so we can tell our files from arbitrary JSON. */
export const EXPORT_FORMAT = 'prophecy-export';

const int = z.number().int();
const str = z.string();

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
  biographie: str,
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
  conditions: str,
  notes: str,
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
});

const CAST_UNITS = EFFECT_UNITS.map((u) => u.key) as [string, ...string[]];
const spellSchema = z.object({
  name: str,
  // Niveau. OPTIONAL (not a version bump, like `cleParfaite`): exports made
  // before the column existed have no such field and still import — missing
  // falls back to the column default (1).
  level: int.optional(),
  complexity: int,
  discipline: str,
  sphere: str,
  cost: int,
  castTimeAmount: int,
  castTimeUnit: z.enum(CAST_UNITS),
  difficulty: int,
  cle: str,
  // Perfect key. OPTIONAL (not a version bump, like `uuid`): exports made before
  // the column existed have no such field and still import — missing falls back
  // to the column default (false).
  cleParfaite: z.boolean().optional(),
  effect: str,
});

// Magic reserve objects. OPTIONAL with a `[]` default (not a version bump, like
// the spell `level`): exports made before the table existed simply carry none.
const magicReserveSchema = z.object({
  nom: str,
  max: int,
  current: int,
});

const effectSchema = z.object({
  label: str,
  target: str,
  value: int,
  durationUnit: z.enum(CAST_UNITS),
  durationRemaining: int,
  expired: z.boolean(),
});

const characterBundleSchema = z.object({
  character: characterSchema,
  state: stateSchema,
  skills: z.array(skillSchema),
  armor: z.array(armorSchema),
  weapons: z.array(weaponSchema),
  spells: z.array(spellSchema),
  magicReserves: z.array(magicReserveSchema).default([]),
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
export const SPELL_FIELDS = Object.keys(spellSchema.shape);
export const MAGIC_RESERVE_FIELDS = Object.keys(magicReserveSchema.shape);
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
