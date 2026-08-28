// Catalog build: data-src/*.csv → src/data/*-catalog.gen.ts
//
// The weapon/spell catalogs are authored as spreadsheet tables (edit in Excel,
// save as CSV with `;` — the French Excel default) instead of hand-written TS.
// This script parses, VALIDATES and code-generates the typed arrays the app
// imports. Run with:
//
//   bun run build:catalogs           # regenerate
//   bun run build:catalogs -- --check  # verify the .gen files are up to date
//
// Validation is strict on purpose — a typo dies here, at build time, instead of
// shipping a weapon whose damage formula silently falls back to raw text:
//   - the header must match the expected columns EXACTLY (a misspelled optional
//     column would otherwise drop its whole column of data without a word)
//   - damage / range formulas must parse (lib/formula parseFormula)
//   - prerequisites: every comma-separated segment must parse (the app parser is
//     lenient and skips garbage; the build is not)
//   - categories, handedness, disciplines, spheres, cast-time units must match
//     the app's constants — matched loosely (case/accents/key-or-label) and
//     normalized to the canonical value, so "feu", "Feu" and "sphereFeu" all work
//   - ids must be unique, kebab-case slugs
// All errors are collected and reported with their CSV record line, then the
// script exits 1 without touching the generated files.
//
// The generation itself is a PURE function of the CSV files (`generateCatalogs`)
// so `src/data/catalog.test.ts` can re-run it and fail when a committed .gen file
// has drifted from its CSV — i.e. when someone edited the spreadsheet and forgot
// to run this script.
//
// IMPORTANT: this script must never import a module that (transitively) loads a
// generated file at runtime, or it could not run to recreate one. That is why the
// weapon taxonomy lives in `src/data/weapon-constants.ts`.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CASTES,
  DEFAULT_SKILLS,
  DISCIPLINES,
  SPELL_TAGS,
  SPHERES,
  TIME_UNITS,
} from '../src/constants/prophecy';
import { parseCsvTable } from '../src/lib/csv';
import { parseFormula, parsePrerequisites } from '../src/lib/formula';
import { presetRevision } from '../src/lib/preset-revision';
import { ARMOR_CATEGORIES } from '../src/data/armor-constants';
import {
  CATEGORY_SKILL,
  HAND_VALUE,
  WEAPON_CATEGORIES,
  WEAPON_HANDS,
} from '../src/data/weapon-constants';
import type {
  ArchetypeOption,
  ArchetypePreset,
  ArchetypeSkill,
} from '../src/data/archetype-catalog';
import type { ArmorPreset } from '../src/data/armor-catalog';
import type { ShieldPreset } from '../src/data/shield-catalog';
import type { WeaponPreset } from '../src/data/weapon-catalog';
import type { SpellPreset } from '../src/data/spell-catalog';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'data-src');
const OUT_DIR = join(ROOT, 'src', 'data');

/** Expected CSV columns, in no particular order — extras and typos both fail. */
const WEAPON_COLUMNS = [
  'id', 'categorie', 'mains', 'nom', 'degats', 'prerequis', 'initMelee', 'initCaC',
  'diffCreation', 'tempsCreation', 'special', 'porteeEff', 'porteeMax',
];
const SPELL_COLUMNS = [
  'id', 'nom', 'niveau', 'complexite', 'discipline', 'sphere', 'cout',
  'tempsIncantation', 'uniteIncantation', 'difficulte', 'cle', 'effet',
  // Editorial provenance (which rulebook a spell comes from). Declared so the
  // header check accepts it, then deliberately NOT read: the app catalogue has
  // no use for it, and the `spells` table has no column to hold it. It lives in
  // the spreadsheet for the authors, not for the build.
  'rulebook',
  // The convenience layer extracted from `effet` (see the `spells` doc comment
  // in db/schema.ts). ALL OPTIONAL — the catalogue is being filled rulebook by
  // rulebook, so an empty cell is the normal state, not an error. `effet` itself
  // stays the source of truth and is never rewritten from these.
  'effetJeu', 'perception', 'duree', 'dureeUnite', 'cibles', 'tags',
  // Draconic restriction — reserved to a mage sworn to the dragon who patrons
  // the spell's own sphère, rather than open to the whole sphère. A flag and not
  // a dragon's name: the pairing is one-to-one, so the sphère already says which
  // one. Optional like the rest — an empty cell is the common case.
  'reserveDragon',
];
const ARMOR_COLUMNS = [
  'id', 'categorie', 'nom', 'defenseMax', 'prerequis', 'diffCreation',
  'tempsCreation', 'encombrement', 'special',
];
const SHIELD_COLUMNS = [
  'id', 'nom', 'degats', 'prerequis', 'diffCreation',
  'tempsCreation', 'defenseMax', 'encombrement', 'special',
];
const ARCHETYPE_COLUMNS = [
  'id', 'nom', 'caste', 'concept',
  // Caractéristiques, then attributs — the CSV uses the sheet's short names.
  'for', 'res', 'int', 'vol', 'coo', 'per', 'pre', 'emp',
  'physique', 'mental', 'manuel', 'social',
  // Pools only: the wound track and the initiative dice are DERIVED from the
  // rolled caractéristiques (lib/creation-rules), never authored.
  'maitrise', 'chance',
  // « Compétence 3, Autre 2 » — names matched against DEFAULT_SKILLS.
  'competences',
  // The single pre-generation choice, all three blank when there is none.
  'optionLabel', 'optionValeur', 'optionChoix',
];

// --- loose matching ---------------------------------------------------------
// Authors type what they read in the rulebook; we accept any casing/accents and
// either the key or the label, then normalize to the canonical value.

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .toLowerCase()
    .trim();

/** Build a folded-form → canonical-value lookup from accepted spellings. */
function matcher(entries: [accepted: string, canonical: string][]) {
  const map = new Map(entries.map(([a, c]) => [fold(a), c]));
  return (input: string): string | null => map.get(fold(input)) ?? null;
}

const matchCategory = matcher(WEAPON_CATEGORIES.map((c) => [c, c]));
const matchArmorCategory = matcher(ARMOR_CATEGORIES.map((c) => [c, c]));
const matchHands = matcher([
  ...WEAPON_HANDS.map((h): [string, string] => [h, h]),
  ...WEAPON_HANDS.map((h): [string, string] => [String(HAND_VALUE[h]), h]),
]);
const matchDiscipline = matcher(
  DISCIPLINES.flatMap((d): [string, string][] => [
    [d.key, d.key],
    [d.label, d.key],
  ]),
);
const matchSphere = matcher(
  SPHERES.flatMap((s): [string, string][] => [
    [s.key, s.key],
    [s.label, s.key],
    // "sphereFeu" minus the prefix — lets authors write just "feu".
    [s.key.replace(/^sphere/, ''), s.key],
  ]),
);
// One matcher for every duration in the CSV — cast time and spell durée both
// speak TIME_UNITS, in any casing, singular or plural.
const matchUnit = matcher(
  TIME_UNITS.flatMap((u): [string, string][] => [
    [u.key, u.key],
    [u.label, u.key],
    [u.plural, u.key],
  ]),
);
const matchTag = matcher(
  SPELL_TAGS.flatMap((t): [string, string][] => [
    [t.key, t.key],
    [t.label, t.key],
  ]),
);
const matchCaste = matcher(
  CASTES.flatMap((c): [string, string][] => [
    [c.key, c.key],
    [c.label, c.key],
  ]),
);

/**
 * Folded compétence name → its catalogue entry. An archetype names its
 * compétences the way the sheet prints them (« Éloquence », « Équitation »),
 * while DEFAULT_SKILLS stores some of them accent-free — folding is what lets
 * the spreadsheet stay readable without the two drifting.
 */
const SKILL_BY_FOLDED = new Map(DEFAULT_SKILLS.map((s) => [fold(s.name), s]));

// --- per-field validators ---------------------------------------------------

type RowErrors = string[];

function readInt(rec: Record<string, string>, col: string, errors: RowErrors): number {
  const raw = rec[col] ?? '';
  if (!/^-?\d+$/.test(raw)) {
    errors.push(`${col} : entier attendu, reçu « ${raw} »`);
    return 0;
  }
  return Number(raw);
}

/**
 * A number that may be fractional (only `tempsCreation` so far — half a day).
 * French Excel writes decimals with a COMMA, so both separators are accepted.
 */
function readNumber(rec: Record<string, string>, col: string, errors: RowErrors): number {
  const raw = (rec[col] ?? '').trim();
  if (!/^-?\d+([.,]\d+)?$/.test(raw)) {
    errors.push(`${col} : nombre attendu (ex : 4 ou 0,5), reçu « ${raw} »`);
    return 0;
  }
  return Number(raw.replace(',', '.'));
}

function readFormula(
  rec: Record<string, string>,
  col: string,
  errors: RowErrors,
  // `nr` / `sphere` opt into the spell variables — durations and target counts
  // only, never a weapon's damage.
  { required = false, nr = false, sphere = false } = {},
): string | null {
  const raw = (rec[col] ?? '').trim();
  if (raw === '') {
    if (required) errors.push(`${col} : requis`);
    return null;
  }
  const parsed = parseFormula(raw, { nr, sphere });
  if (!parsed.ok) errors.push(`${col} « ${raw} » : ${parsed.error}`);
  return raw;
}

/**
 * An enum column that may be left blank. `requiredWhen` makes it mandatory only
 * in the case that needs it — a `dureeUnite` is meaningless without a `duree`,
 * and mandatory as soon as there is one.
 */
function readOptionalEnum(
  rec: Record<string, string>,
  col: string,
  match: (s: string) => string | null,
  valid: readonly string[],
  errors: RowErrors,
  { requiredWhen = false, fallback = valid[0] } = {},
): string {
  const raw = (rec[col] ?? '').trim();
  if (raw === '') {
    if (requiredWhen) errors.push(`${col} : requis (valides : ${valid.join(', ')})`);
    return fallback;
  }
  const canonical = match(raw);
  if (canonical == null) {
    errors.push(`${col} : « ${raw} » inconnu (valides : ${valid.join(', ')})`);
    return fallback;
  }
  return canonical;
}

/**
 * A yes/no cell. Accepts everything a French spreadsheet actually holds for one
 * — « oui », « x », « X », « 1 », « vrai », « true » — and their negatives, in
 * any casing or accenting. Blank is false: an unfilled column is the normal
 * state while the catalogue is being tagged rulebook by rulebook. Anything else
 * is a typo and fails the build rather than reading as false, which would
 * silently drop the flag off the spell it was written for.
 */
const TRUE_CELLS = new Set(['oui', 'o', 'x', '1', 'vrai', 'true', 'yes']);
const FALSE_CELLS = new Set(['', 'non', 'n', '0', 'faux', 'false', 'no']);

function readFlag(rec: Record<string, string>, col: string, errors: RowErrors): boolean {
  const raw = fold(rec[col] ?? '');
  if (TRUE_CELLS.has(raw)) return true;
  if (FALSE_CELLS.has(raw)) return false;
  errors.push(`${col} : « ${rec[col]} » n'est ni oui ni non (laisser vide = non)`);
  return false;
}

/** Tag key → its rank in SPELL_TAGS, so a tag list can be put in one order. */
const TAG_ORDER = new Map(SPELL_TAGS.map((t, i) => [t.key as string, i]));

/**
 * A comma-separated tag list, matched against SPELL_TAGS. Strict like every
 * other enum here: a tag that is not in the taxonomy is a typo, and silently
 * dropping it would leave the spell unfindable in the filter it was tagged for.
 * Duplicates are collapsed rather than rejected — they change nothing.
 *
 * Sorted into TAXONOMY order rather than kept in the author's. The editor's
 * `<ChipMultiSelect>` already normalizes that way, so without this the same tag
 * set renders in two different orders depending on whether the spell came from
 * the CSV or from the app — and re-typing a cell would reshuffle the generated
 * array for no semantic change.
 */
function readTags(rec: Record<string, string>, col: string, errors: RowErrors): string[] {
  const raw = (rec[col] ?? '').trim();
  if (raw === '') return [];
  const out = new Set<string>();
  for (const seg of raw.split(',')) {
    const label = seg.trim();
    if (label === '') continue;
    const canonical = matchTag(label);
    if (canonical == null) errors.push(`${col} : tag « ${label} » inconnu`);
    else out.add(canonical);
  }
  return [...out].sort((a, b) => (TAG_ORDER.get(a) ?? 0) - (TAG_ORDER.get(b) ?? 0));
}

function readEnum(
  rec: Record<string, string>,
  col: string,
  match: (s: string) => string | null,
  valid: readonly string[],
  errors: RowErrors,
): string {
  const raw = (rec[col] ?? '').trim();
  const canonical = match(raw);
  if (canonical == null) {
    errors.push(`${col} : « ${raw} » inconnu (valides : ${valid.join(', ')})`);
    return valid[0];
  }
  return canonical;
}

function readSlug(rec: Record<string, string>, seen: Set<string>, errors: RowErrors): string {
  const id = (rec.id ?? '').trim();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    errors.push(`id : « ${id} » n'est pas un slug kebab-case (ex : epee-courte)`);
    // Don't remember a rejected id, or every later bad row also reads "en double".
    return id;
  }
  if (seen.has(id)) errors.push(`id : « ${id} » en double`);
  seen.add(id);
  return id;
}

/** Strict prerequisites: every non-empty comma segment must parse. */
function readPrerequisites(rec: Record<string, string>, errors: RowErrors): string {
  const raw = (rec.prerequis ?? '').trim();
  if (raw === '') return '';
  const segments = raw.split(',').map((s) => s.trim()).filter((s) => s !== '');
  const parsed = parsePrerequisites(raw);
  if (parsed.length !== segments.length) {
    errors.push(`prerequis « ${raw} » : segment invalide (attendu : "FOR 4, COO 5")`);
  }
  return raw;
}

// --- table builders ---------------------------------------------------------

/** A rejected row. `record` is the CSV line; omitted for whole-file problems. */
export type Failure = { file: string; record?: number; name: string; errors: RowErrors };

/**
 * Read a CSV and check its header against the expected columns. A parse error
 * (unclosed quote, duplicate header, row wider than the header) is reported as a
 * header-line failure instead of crashing the script with a stack trace, so the
 * author still gets the full "corrigez le CSV" list.
 */
function readTable(file: string, columns: string[], failures: Failure[]): Record<string, string>[] {
  let table;
  try {
    table = parseCsvTable(readFileSync(join(SRC_DIR, file), 'utf8'));
  } catch (e) {
    // The parser's own messages already carry the offending line.
    failures.push({ file, name: 'lecture', errors: [(e as Error).message] });
    return [];
  }

  const label = (h: string) => (h === '' ? '(colonne sans nom)' : `« ${h} »`);
  const missing = columns.filter((c) => !table.header.includes(c));
  const unknown = table.header.filter((h) => !columns.includes(h));
  const errors: RowErrors = [];
  if (missing.length) errors.push(`colonne(s) manquante(s) : ${missing.map(label).join(', ')}`);
  if (unknown.length) {
    errors.push(`colonne(s) inconnue(s) : ${unknown.map(label).join(', ')} (faute de frappe ?)`);
  }
  if (errors.length) {
    failures.push({ file, record: 1, name: 'en-têtes', errors });
    return [];
  }
  return table.records;
}

function buildWeapons(failures: Failure[]): WeaponPreset[] {
  const records = readTable('weapons.csv', WEAPON_COLUMNS, failures);
  const seen = new Set<string>();
  const out: WeaponPreset[] = [];

  records.forEach((rec, i) => {
    const errors: RowErrors = [];
    const id = readSlug(rec, seen, errors);
    const nom = (rec.nom ?? '').trim();
    if (nom === '') errors.push('nom : requis');

    const category = readEnum(
      rec,
      'categorie',
      matchCategory,
      WEAPON_CATEGORIES,
      errors,
    ) as WeaponPreset['category'];

    const preset: WeaponPreset = {
      id,
      category,
      hands: readEnum(rec, 'mains', matchHands, WEAPON_HANDS, errors) as WeaponPreset['hands'],
      data: {
        name: nom,
        // Resolved HERE, not in the CSV: one category maps to exactly one
        // compétence (see CATEGORY_SKILL), so the spreadsheet stays free of a
        // column that would only ever restate the category. Baking it into the
        // preset means the weapon row carries the skill and the category never
        // has to be persisted.
        skillName: CATEGORY_SKILL[category] ?? null,
        damage: readFormula(rec, 'degats', errors, { required: true }) ?? '',
        prerequisites: readPrerequisites(rec, errors),
        initMelee: readInt(rec, 'initMelee', errors),
        initCorpsACorps: readInt(rec, 'initCaC', errors),
        creationDifficulty: readInt(rec, 'diffCreation', errors),
        creationTime: readNumber(rec, 'tempsCreation', errors),
        special: (rec.special ?? '').trim(),
        rangeEffective: readFormula(rec, 'porteeEff', errors),
        rangeMax: readFormula(rec, 'porteeMax', errors),
      },
    };
    if (errors.length) failures.push({ file: 'weapons.csv', record: i + 2, name: nom || id, errors });
    else out.push(preset);
  });
  return out;
}

function buildSpells(failures: Failure[]): SpellPreset[] {
  const records = readTable('spells.csv', SPELL_COLUMNS, failures);
  const seen = new Set<string>();
  const disciplineKeys = DISCIPLINES.map((d) => d.key);
  const sphereKeys = SPHERES.map((s) => s.key);
  const unitKeys = TIME_UNITS.map((u) => u.key);
  const out: SpellPreset[] = [];

  records.forEach((rec, i) => {
    const errors: RowErrors = [];
    const id = readSlug(rec, seen, errors);
    const nom = (rec.nom ?? '').trim();
    if (nom === '') errors.push('nom : requis');

    const inGameEffect = (rec.effetJeu ?? '').trim();
    const sensoryEffect = (rec.perception ?? '').trim();
    const duration = readFormula(rec, 'duree', errors, { nr: true, sphere: true }) ?? '';
    const targets = readFormula(rec, 'cibles', errors, { nr: true, sphere: true }) ?? '';
    const tags = readTags(rec, 'tags', errors);
    // Empty is the norm — only a handful of sortilèges are sworn to one dragon.
    const dragonOnly = readFlag(rec, 'reserveDragon', errors);
    const durationUnit = readOptionalEnum(
      rec,
      'dureeUnite',
      matchUnit,
      unitKeys,
      errors,
      // Only meaningful alongside a durée — and mandatory as soon as there is
      // one, or "(1 + NR)" would render with no unit at all.
      { requiredWhen: duration !== '', fallback: 'round' },
    ) as SpellPreset['data']['durationUnit'];

    const data: SpellPreset['data'] = {
      name: nom,
      level: readInt(rec, 'niveau', errors),
      complexity: readInt(rec, 'complexite', errors),
      discipline: readEnum(rec, 'discipline', matchDiscipline, disciplineKeys, errors) as SpellPreset['data']['discipline'],
      sphere: readEnum(rec, 'sphere', matchSphere, sphereKeys, errors) as SpellPreset['data']['sphere'],
      cost: readInt(rec, 'cout', errors),
      castTimeAmount: readInt(rec, 'tempsIncantation', errors),
      castTimeUnit: readEnum(rec, 'uniteIncantation', matchUnit, unitKeys, errors) as SpellPreset['data']['castTimeUnit'],
      difficulty: readInt(rec, 'difficulte', errors),
      cle: (rec.cle ?? '').trim(),
      effect: (rec.effet ?? '').trim(),
      // The convenience layer is OMITTED when empty rather than written as ""
      // — every one of these columns has a DB default, and the catalogue is
      // being filled one rulebook at a time. Emitting them unconditionally
      // would put six dead keys on all 329 presets and make every unrelated
      // catalogue diff unreadable. `durationUnit` rides with `duration`: on
      // its own it says nothing.
      ...(inGameEffect !== '' && { inGameEffect }),
      ...(sensoryEffect !== '' && { sensoryEffect }),
      ...(duration !== '' && { duration, durationUnit }),
      ...(targets !== '' && { targets }),
      ...(tags.length > 0 && { tags }),
      ...(dragonOnly && { dragonOnly }),
    };

    // Fingerprint of the payload alone — see lib/preset-revision for what is in
    // it and why `id` is not.
    const preset: SpellPreset = { id, revision: presetRevision(data), data };
    if (errors.length) failures.push({ file: 'spells.csv', record: i + 2, name: nom || id, errors });
    else out.push(preset);
  });
  return out;
}

function buildArmor(failures: Failure[]): ArmorPreset[] {
  const records = readTable('armor.csv', ARMOR_COLUMNS, failures);
  const seen = new Set<string>();
  const out: ArmorPreset[] = [];

  records.forEach((rec, i) => {
    const errors: RowErrors = [];
    const id = readSlug(rec, seen, errors);
    const nom = (rec.nom ?? '').trim();
    if (nom === '') errors.push('nom : requis');

    const preset: ArmorPreset = {
      id,
      category: readEnum(rec, 'categorie', matchArmorCategory, ARMOR_CATEGORIES, errors) as ArmorPreset['category'],
      data: {
        name: nom,
        defenseMax: readInt(rec, 'defenseMax', errors),
        prerequisites: readPrerequisites(rec, errors),
        creationDifficulty: readInt(rec, 'diffCreation', errors),
        creationTime: readNumber(rec, 'tempsCreation', errors),
        encombrementMalus: readInt(rec, 'encombrement', errors),
        special: (rec.special ?? '').trim(),
      },
    };
    if (errors.length) failures.push({ file: 'armor.csv', record: i + 2, name: nom || id, errors });
    else out.push(preset);
  });
  return out;
}

function buildShields(failures: Failure[]): ShieldPreset[] {
  const records = readTable('shield.csv', SHIELD_COLUMNS, failures);
  const seen = new Set<string>();
  const out: ShieldPreset[] = [];

  records.forEach((rec, i) => {
    const errors: RowErrors = [];
    const id = readSlug(rec, seen, errors);
    const nom = (rec.nom ?? '').trim();
    if (nom === '') errors.push('nom : requis');

    const preset: ShieldPreset = {
      id,
      data: {
        name: nom,
        damage: readFormula(rec, 'degats', errors, { required: true }) ?? '',
        prerequisites: readPrerequisites(rec, errors),
        creationDifficulty: readInt(rec, 'diffCreation', errors),
        creationTime: readNumber(rec, 'tempsCreation', errors),
        defenseMax: readInt(rec, 'defenseMax', errors),
        encombrementMalus: readInt(rec, 'encombrement', errors),
        special: (rec.special ?? '').trim(),
      },
    };
    if (errors.length) failures.push({ file: 'shield.csv', record: i + 2, name: nom || id, errors });
    else out.push(preset);
  });
  return out;
}

/**
 * « Artisanat 3, Estimation 2 » → resolved compétences, attribut included.
 *
 * Strict like every other enum here: an unknown compétence is a typo, and
 * writing it through would put a skill on the sheet that no roll can ever find
 * (effects and weapons target a skill BY NAME). The attribut is resolved at
 * build time so the generator never has to look one up.
 */
function readSkillList(
  rec: Record<string, string>,
  col: string,
  errors: RowErrors,
): ArchetypeSkill[] {
  const raw = (rec[col] ?? '').trim();
  if (raw === '') return [];
  const out: ArchetypeSkill[] = [];
  const seen = new Set<string>();
  for (const seg of raw.split(',')) {
    const text = seg.trim();
    if (text === '') continue;
    const m = /^(.+?)\s+(\d+)$/.exec(text);
    if (!m) {
      errors.push(`${col} : « ${text} » attendu sous la forme « Nom 3 »`);
      continue;
    }
    const skill = SKILL_BY_FOLDED.get(fold(m[1]));
    if (!skill) {
      errors.push(`${col} : compétence « ${m[1].trim()} » inconnue`);
      continue;
    }
    if (seen.has(skill.name)) {
      errors.push(`${col} : compétence « ${skill.name} » en double`);
      continue;
    }
    seen.add(skill.name);
    out.push({ name: skill.name, attribut: skill.attribut, value: Number(m[2]) });
  }
  return out;
}

/** Label → key, for an option's stable list key. */
const slugify = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * The row's single pre-generation choice, or null when the three columns are
 * blank. Half-filled is an ERROR rather than a silent null: an author who typed
 * the choices and forgot the label meant to offer a choice.
 */
function readOption(rec: Record<string, string>, errors: RowErrors): ArchetypeOption | null {
  const label = (rec.optionLabel ?? '').trim();
  const rawValue = (rec.optionValeur ?? '').trim();
  const rawChoices = (rec.optionChoix ?? '').trim();
  // "0" counts as blank for the value: an empty numeric cell often comes back
  // from Excel as a zero, and no option means no rating.
  if (label === '' && rawChoices === '' && (rawValue === '' || rawValue === '0')) return null;

  if (label === '') errors.push('optionLabel : requis dès qu\'une option est définie');
  const value = readInt(rec, 'optionValeur', errors);
  const choices: string[] = [];
  for (const seg of rawChoices.split('|')) {
    const name = seg.trim();
    if (name === '') continue;
    const skill = SKILL_BY_FOLDED.get(fold(name));
    if (!skill) errors.push(`optionChoix : compétence « ${name} » inconnue`);
    else if (choices.includes(skill.name)) errors.push(`optionChoix : « ${skill.name} » en double`);
    else choices.push(skill.name);
  }
  if (choices.length < 2) errors.push('optionChoix : au moins deux compétences séparées par « | »');
  return { key: slugify(label), label, value, choices };
}

function buildArchetypes(failures: Failure[]): ArchetypePreset[] {
  const records = readTable('archetypes.csv', ARCHETYPE_COLUMNS, failures);
  const seen = new Set<string>();
  const casteKeys = CASTES.map((c) => c.key);
  const out: ArchetypePreset[] = [];

  records.forEach((rec, i) => {
    const errors: RowErrors = [];
    const id = readSlug(rec, seen, errors);
    const nom = (rec.nom ?? '').trim();
    if (nom === '') errors.push('nom : requis');

    // Blank is « Sans Caste » — NULL is a meaningful value on `characters.caste`,
    // so an empty cell is a choice, not a missing one.
    const rawCaste = (rec.caste ?? '').trim();
    let caste: ArchetypePreset['caste'] = null;
    if (rawCaste !== '') {
      const canonical = matchCaste(rawCaste);
      if (canonical == null) {
        errors.push(`caste : « ${rawCaste} » inconnue (valides : ${casteKeys.join(', ')})`);
      } else {
        caste = canonical as ArchetypePreset['caste'];
      }
    }

    const skills = readSkillList(rec, 'competences', errors);
    if (skills.length === 0) errors.push('competences : au moins une compétence attendue');

    const preset: ArchetypePreset = {
      id,
      caste,
      data: {
        name: nom,
        concept: (rec.concept ?? '').trim(),
        stats: {
          force: readInt(rec, 'for', errors),
          resistance: readInt(rec, 'res', errors),
          intelligence: readInt(rec, 'int', errors),
          volonte: readInt(rec, 'vol', errors),
          coordination: readInt(rec, 'coo', errors),
          perception: readInt(rec, 'per', errors),
          presence: readInt(rec, 'pre', errors),
          empathie: readInt(rec, 'emp', errors),
          physique: readInt(rec, 'physique', errors),
          mental: readInt(rec, 'mental', errors),
          manuel: readInt(rec, 'manuel', errors),
          social: readInt(rec, 'social', errors),
          maitriseMax: readInt(rec, 'maitrise', errors),
          chanceMax: readInt(rec, 'chance', errors),
        },
        skills,
        option: readOption(rec, errors),
      },
    };
    if (errors.length) {
      failures.push({ file: 'archetypes.csv', record: i + 2, name: nom || id, errors });
    } else {
      out.push(preset);
    }
  });
  return out;
}

// --- codegen ----------------------------------------------------------------

function render(sourceCsv: string, typeName: string, typeImport: string, constName: string, data: unknown[]) {
  return `// GENERATED by scripts/build-catalogs.ts from data-src/${sourceCsv} — DO NOT EDIT.
// Edit the CSV (Excel, séparateur « ; ») then run: bun run build:catalogs
import type { ${typeName} } from '${typeImport}';

export const ${constName}: ${typeName}[] = ${JSON.stringify(data, null, 2)};
`;
}

export type GeneratedFile = { file: string; content: string };

/**
 * Parse + validate both CSVs and render the .gen sources. PURE apart from
 * reading `data-src/` — it writes nothing, so tests can compare the result with
 * what is committed on disk.
 */
export function generateCatalogs(): {
  failures: Failure[];
  files: GeneratedFile[];
  counts: {
    weapons: number;
    spells: number;
    armor: number;
    shields: number;
    archetypes: number;
  };
} {
  const failures: Failure[] = [];
  const weapons = buildWeapons(failures);
  const spells = buildSpells(failures);
  const armor = buildArmor(failures);
  const shields = buildShields(failures);
  const archetypes = buildArchetypes(failures);
  return {
    failures,
    counts: {
      weapons: weapons.length,
      spells: spells.length,
      armor: armor.length,
      shields: shields.length,
      archetypes: archetypes.length,
    },
    files: [
      {
        file: 'weapon-catalog.gen.ts',
        content: render('weapons.csv', 'WeaponPreset', './weapon-catalog', 'WEAPON_CATALOG_DATA', weapons),
      },
      {
        file: 'spell-catalog.gen.ts',
        content: render('spells.csv', 'SpellPreset', './spell-catalog', 'SPELL_CATALOG_DATA', spells),
      },
      {
        file: 'armor-catalog.gen.ts',
        content: render('armor.csv', 'ArmorPreset', './armor-catalog', 'ARMOR_CATALOG_DATA', armor),
      },
      {
        file: 'shield-catalog.gen.ts',
        content: render('shield.csv', 'ShieldPreset', './shield-catalog', 'SHIELD_CATALOG_DATA', shields),
      },
      {
        file: 'archetype-catalog.gen.ts',
        content: render(
          'archetypes.csv',
          'ArchetypePreset',
          './archetype-catalog',
          'ARCHETYPE_CATALOG_DATA',
          archetypes,
        ),
      },
    ],
  };
}

/** Absolute path of a generated catalogue file. */
export const generatedPath = (file: string) => join(OUT_DIR, file);

/**
 * Compare generated output with a working copy ignoring line endings: the repo
 * has `core.autocrlf=true`, so a Windows checkout materializes the committed
 * .gen files with CRLF while this script always writes LF. Comparing raw bytes
 * would report every freshly cloned catalogue as stale.
 */
export const sameContent = (a: string, b: string) =>
  a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n');

/** Format the collected failures the way the CLI prints them. */
export function formatFailures(failures: Failure[]): string {
  return failures
    .map((f) =>
      [
        `  ${f.file}${f.record === undefined ? '' : ` ligne ${f.record}`} (${f.name})`,
        ...f.errors.map((e) => `    - ${e}`),
      ].join('\n'),
    )
    .join('\n');
}

// --- CLI --------------------------------------------------------------------

function main() {
  const check = process.argv.includes('--check');
  const { failures, files, counts } = generateCatalogs();

  if (failures.length > 0) {
    console.error('Catalogues NON générés — corrigez le CSV :\n');
    console.error(formatFailures(failures));
    process.exit(1);
  }

  if (check) {
    const stale = files.filter((f) => {
      try {
        return !sameContent(readFileSync(generatedPath(f.file), 'utf8'), f.content);
      } catch {
        return true; // missing file — regenerate
      }
    });
    if (stale.length > 0) {
      console.error(
        `Catalogues obsolètes : ${stale.map((f) => f.file).join(', ')}\n` +
          'Le CSV a changé sans régénération — lancez : bun run build:catalogs',
      );
      process.exit(1);
    }
    console.log('OK : catalogues à jour.');
    return;
  }

  for (const f of files) writeFileSync(generatedPath(f.file), f.content, 'utf8');
  console.log(
    `OK : ${counts.weapons} armes, ${counts.spells} sortilèges, ${counts.armor} armures, ` +
      `${counts.shields} boucliers, ${counts.archetypes} archétypes.`,
  );
}

// Only run as a script — importing this module (tests) must have no side effect.
if (import.meta.main) main();
