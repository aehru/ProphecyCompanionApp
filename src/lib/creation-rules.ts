/**
 * Prophecy 2e creation rules — the derivations a character sheet needs but the
 * app has always asked the player to type by hand.
 *
 * It lives on its own (not inside the NPC generator that motivated it) because
 * the same numbers are wanted twice: an NPC rolled from an archetype, and a
 * future guided character creation. A rule encoded here is written once and
 * both callers read the same table.
 *
 * Pure — no framework, no DB imports — so it loads in plain-Node vitest like
 * the other engines in lib/.
 */

import type {
  AttributKey,
  CaracKey,
  ResourceKey,
  TendanceKey,
  TraitRarity,
} from '@/constants/prophecy';

/**
 * A rulebook band table: `min` is a row's lower bound, inclusive, and a row runs
 * until the next one starts. Every derivation below is read this way, so the
 * scan lives in one place — including how it treats the ends (see `bandValue`).
 */
type Band<T> = { min: number; value: T };

/**
 * The row a score falls in. Below the first bound the FIRST row is returned and
 * above the last the LAST one, because a rulebook table stops where the rulebook
 * stopped: clamping keeps an out-of-range sheet legal instead of inventing a row
 * nobody wrote — the same choice `casteFromInput` makes for an unknown caste.
 */
function bandValue<T>(bands: readonly Band<T>[], score: number): T {
  let match = bands[0].value;
  for (const band of bands) {
    if (score >= band.min) match = band.value;
  }
  return match;
}

/**
 * The two caractéristiques a derivation reads, as one number. Missing or
 * negative reads as 0 so a half-filled sheet still derives something usable.
 */
const pairScore = (a: number, b: number) => Math.max(0, Math.round((a || 0) + (b || 0)));

/** Max wound boxes per level — keys match the `*_max` columns on `characters`. */
export type WoundBoxes = {
  egratignureMax: number;
  legereMax: number;
  graveMax: number;
  fataleMax: number;
  mortMax: number;
};

/**
 * Wound boxes by RÉSISTANCE + VOLONTÉ, as bands. `min` is the band's lower
 * bound, inclusive; a band runs until the next one starts.
 *
 * Written as a table rather than a formula because it is one: the rulebook's
 * progression is irregular (légère jumps 3→4 while égratignure stays at 3), so
 * any closed form would be a fit, not the rule.
 */
const WOUND_BANDS: Band<WoundBoxes>[] = [
  { min: 0, value: { egratignureMax: 2, legereMax: 1, graveMax: 1, fataleMax: 1, mortMax: 1 } },
  { min: 5, value: { egratignureMax: 3, legereMax: 2, graveMax: 1, fataleMax: 1, mortMax: 1 } },
  { min: 10, value: { egratignureMax: 3, legereMax: 2, graveMax: 2, fataleMax: 1, mortMax: 1 } },
  { min: 15, value: { egratignureMax: 3, legereMax: 3, graveMax: 2, fataleMax: 2, mortMax: 1 } },
  { min: 20, value: { egratignureMax: 3, legereMax: 4, graveMax: 3, fataleMax: 2, mortMax: 1 } },
];

/**
 * RÉS + VOL → the character's wound track.
 *
 * The rulebook's table stops at 24 and the top row is kept past it (see
 * `bandValue`). Returns a fresh object, so a caller can spread or edit it.
 */
export function woundBoxes(resistance: number, volonte: number): WoundBoxes {
  return { ...bandValue(WOUND_BANDS, pairScore(resistance, volonte)) };
}

/**
 * Initiative dice by COORDINATION + PERCEPTION, same band shape as the wound
 * track. `min` is inclusive and a band runs until the next one starts.
 *
 * The steps are 4 wide, then 3 — irregular again, so again a table.
 */
const INITIATIVE_BANDS: Band<number>[] = [
  { min: 2, value: 1 },
  { min: 6, value: 2 },
  { min: 10, value: 3 },
  { min: 14, value: 4 },
  { min: 17, value: 5 },
];

/**
 * COO + PER → how many actions the character gets per turn.
 *
 * Clamped at both ends by the same band scan: the table starts at 2 (the lowest
 * a pair of scored caractéristiques can reach) and stops at 19. One action is
 * therefore the floor — a character who cannot act is not a weak character, it
 * is an unusable sheet.
 */
export function initiativeDice(coordination: number, perception: number): number {
  return bandValue(INITIATIVE_BANDS, pairScore(coordination, perception));
}

// ── Âge (tables L'ÂGE, MODIFICATEURS D'ÂGE, ATTRIBUTS PAR ÂGE, MAÎTRISE ET CHANCE)

type AgeBand = {
  key: string;
  label: string;
  years: string;
  /** The D10 faces that land on this band. */
  d10: readonly number[];
  /** Only the non-zero modificateurs. */
  mods: Partial<Record<CaracKey, number>>;
  /** The four values distributed among the attributs. */
  attributs: readonly number[];
  /** MAÎTRISE ET CHANCE: points given outright, and points left to distribute. */
  resources: { fixed: Partial<Record<ResourceKey, number>>; free: number };
  /** POINTS DE COMPÉTENCE, one per EXPERIENCE_TIERS entry (normal first). */
  skillPoints: readonly number[];
  /** LES LIMITATIONS: highest score a compétence may reach at creation. */
  skillMax: number;
};

/**
 * The five age bands. The age itself is not stored: the sheet has no column
 * for it, and once its modificateurs are in the caractéristiques and its
 * values in the attributs it has nothing left to change.
 */
export const AGE_BANDS = [
  {
    key: 'enfant',
    label: 'Enfant',
    years: '6-10 ans',
    d10: [1],
    mods: { force: -2, resistance: -2, perception: 1, empathie: 2, presence: 1 },
    attributs: [4, 4, 4, 3],
    resources: { fixed: { chance: 4 }, free: 3 },
    // Vétéran printed as 150, not 70 + 90: kept as the book has it.
    skillPoints: [70, 100, 130, 150],
    skillMax: 6,
  },
  {
    key: 'adolescent',
    label: 'Adolescent',
    years: '11-15 ans',
    d10: [2, 3],
    mods: { force: -1, resistance: -1, perception: 1, empathie: 1 },
    attributs: [5, 4, 4, 3],
    resources: { fixed: { chance: 2 }, free: 4 },
    skillPoints: [90, 120, 150, 180],
    skillMax: 7,
  },
  {
    key: 'adulte',
    label: 'Adulte',
    years: '16-40 ans',
    d10: [4, 5, 6, 7],
    mods: {},
    attributs: [5, 5, 4, 3],
    resources: { fixed: {}, free: 6 },
    skillPoints: [110, 140, 170, 200],
    skillMax: 8,
  },
  {
    key: 'ancien',
    label: 'Ancien',
    years: '41-50 ans',
    d10: [8, 9],
    mods: { force: -1, resistance: -1, intelligence: 1, volonte: 1, perception: -1, presence: 1 },
    attributs: [6, 5, 4, 3],
    resources: { fixed: { maitrise: 2 }, free: 4 },
    skillPoints: [130, 160, 190, 220],
    skillMax: 9,
  },
  {
    key: 'venerable',
    label: 'Vénérable',
    years: '51 ans et plus',
    d10: [10],
    mods: {
      force: -2,
      resistance: -1,
      intelligence: 1,
      volonte: 1,
      perception: -1,
      coordination: -1,
      empathie: 1,
      presence: 1,
    },
    attributs: [6, 6, 4, 3],
    resources: { fixed: { maitrise: 4 }, free: 3 },
    skillPoints: [150, 180, 210, 240],
    skillMax: 10,
  },
] as const satisfies readonly AgeBand[];

export type AgeKey = (typeof AGE_BANDS)[number]['key'];

/** The band read while no age is chosen: Adulte, the one with no modificateur. */
const DEFAULT_AGE: AgeBand = AGE_BANDS[2];

export const ageBand = (age: AgeKey | null): AgeBand | undefined =>
  AGE_BANDS.find((b) => b.key === age);

/** The band a D10 roll lands on. */
export function ageFromD10(roll: number): AgeKey {
  return (AGE_BANDS.find((b) => (b as AgeBand).d10.includes(roll)) ?? DEFAULT_AGE).key as AgeKey;
}

/** One caractéristique's age modificateur (0 with no age chosen). */
export function ageMod(age: AgeKey | null, key: CaracKey): number {
  return ageBand(age)?.mods[key] ?? 0;
}

/** The four attribut values to distribute: the age's row, Adulte by default. */
export function attributPool(age: AgeKey | null): readonly number[] {
  return (ageBand(age) ?? DEFAULT_AGE).attributs;
}

/**
 * The experience a GM may grant a new character (« personnages légèrement
 * expérimentés », etc.), in the order of `AgeBand.skillPoints`.
 */
export const EXPERIENCE_TIERS = [
  { key: 'normal', label: 'Normal' },
  { key: 'leger', label: 'Légèrement expérimenté' },
  { key: 'aguerri', label: 'Aguerri' },
  { key: 'veteran', label: 'Vétéran' },
] as const;

export type ExperienceTier = (typeof EXPERIENCE_TIERS)[number]['key'];

/** Points de Compétence for an age and an experience tier (Adulte by default). */
export function skillPoints(age: AgeKey | null, tier: ExperienceTier): number {
  const i = EXPERIENCE_TIERS.findIndex((t) => t.key === tier);
  return (ageBand(age) ?? DEFAULT_AGE).skillPoints[i];
}

/** The highest score a compétence may have at creation (Adulte by default). */
export function skillMax(age: AgeKey | null): number {
  return (ageBand(age) ?? DEFAULT_AGE).skillMax;
}

/**
 * COÛT DES COMPÉTENCES: points to take a score from `from` to `to`. The table
 * is the triangular numbers — reaching n from 0 costs 1 + 2 + … + n — so any
 * cell is T(to) − T(from). Nothing to pay for a score that does not rise.
 */
export function skillCost(from: number, to: number): number {
  const t = (n: number) => (n * (n + 1)) / 2;
  return to > from ? t(to) - t(Math.max(0, from)) : 0;
}

/** MAÎTRISE ET CHANCE for an age: the age's row, Adulte by default. */
export function resourceStart(age: AgeKey | null): AgeBand['resources'] {
  return (ageBand(age) ?? DEFAULT_AGE).resources;
}

// ── Caractéristiques et Attributs Majeurs ──────────────────────────────────

/** « Les valeurs de départ »: one each for the eight caractéristiques. */
export const STARTING_VALUES = [7, 6, 6, 5, 5, 4, 4, 3] as const;

/** The two caractéristiques an attribut adds up for its modificateur. */
export const ATTRIBUT_CARACS: Record<AttributKey, readonly [CaracKey, CaracKey]> = {
  physique: ['force', 'resistance'],
  mental: ['intelligence', 'volonte'],
  manuel: ['coordination', 'perception'],
  social: ['presence', 'empathie'],
};

/** MODIFICATEURS D'ATTRIBUTS, same band shape as the tables above. */
const ATTRIBUT_MOD_BANDS: Band<number>[] = [
  { min: 1, value: -3 },
  { min: 3, value: -2 },
  { min: 6, value: -1 },
  { min: 9, value: 0 },
  { min: 12, value: 1 },
  { min: 14, value: 2 },
  { min: 16, value: 3 },
  { min: 18, value: 4 },
  { min: 20, value: 5 },
];

/**
 * A caractéristiques sum → the attribut's modificateur. Null at 0, the table's
 * « NA » row: nothing to read yet, which is not the same as a −3.
 */
export function attributModifier(sum: number): number | null {
  return sum <= 0 ? null : bandValue(ATTRIBUT_MOD_BANDS, sum);
}

// ── Désavantages (obligatoires et supplémentaires, par âge) ────────────────

/** One désavantage to take: the rarities it may be drawn from (« Enfants » ou « Communs »). */
export type DesavantageSlot = {
  id: string;
  required: boolean;
  rarities: readonly TraitRarity[];
};

/**
 * DÉSAVANTAGES by âge de départ: each inner list is ONE désavantage and the
 * rarities it may come from. The obligatoires must be taken; the
 * supplémentaires are the player's choice, each worth its points.
 */
const DESAVANTAGE_QUOTAS: Record<AgeKey, { required: TraitRarity[][]; extra: TraitRarity[][] }> = {
  enfant: { required: [['enfant']], extra: [['enfant', 'commun']] },
  adolescent: { required: [['commun']], extra: [['commun'], ['commun']] },
  adulte: { required: [['commun']], extra: [['commun'], ['commun'], ['rare']] },
  ancien: { required: [['commun'], ['ancien']], extra: [['commun'], ['commun'], ['rare'], ['rare']] },
  venerable: {
    required: [['commun'], ['ancien'], ['ancien']],
    extra: [['commun'], ['rare'], ['ancien']],
  },
};

/** The désavantages an age calls for, obligatoires first (Adulte while none is chosen). */
export function desavantageSlots(age: AgeKey | null): DesavantageSlot[] {
  const q = DESAVANTAGE_QUOTAS[age ?? (DEFAULT_AGE.key as AgeKey)];
  return [
    ...q.required.map((rarities, i) => ({ id: `obligatoire-${i}`, required: true, rarities })),
    ...q.extra.map((rarities, i) => ({ id: `supplementaire-${i}`, required: false, rarities })),
  ];
}

// ── Tendances de départ (nation d'origine × âge) ───────────────────────────

/**
 * TENDANCES DE DÉPART, one row per nation, the five cells in AGE_BANDS order
 * (enfant → vénérable), written exactly as the book prints them so the table
 * can be proofread against the page: TD / TF / TH a tendance, L a free point.
 * The nation itself is not stored — the sheet has no column for it; it only
 * proposes the tendances, which stay editable.
 */
export const NATIONS = [
  { key: 'solyr', label: 'Empire de Solyr', start: ['1TH, 1L', '1TD, 1TH, 1L', '2TD, 2TH', '2TD, 2TH, 1L', '2TD, 2TH, 1L'] },
  { key: 'kar', label: 'Kar', start: ['2TD', '1TD, 2L', '2TD, 2L', '3TD, 2L', '4TD, 1L'] },
  { key: 'kali', label: 'Kali', start: ['1TF, 1TH', '1TF, 1TH, 1L', '2TF, 2L', '3TF, 2L', '4TF, 1L'] },
  { key: 'foretMere', label: 'Forêt Mère', start: ['2TD', '2TD, 1TH', '3TD, 1L', '4TD, 1L', '5TD'] },
  { key: 'royaumeFleurs', label: 'Royaume des Fleurs', start: ['2TD', '2TD, 1TH', '3TD, 1L', '4TD, 1L', '5TD'] },
  { key: 'nesora', label: 'Empire Nésora', start: ['1TH, 1L', '2TH, 1L', '3TH, 1L', '3TH, 2L', '4TH, 1L'] },
  { key: 'pomyrie', label: 'Pomyrie', start: ['1TD, 1TH', '2TD, 1L', '2TD, 2L', '3TD, 2L', '3TD, 2L'] },
  { key: 'kern', label: 'Kern', start: ['2TD', '2TD, 1L', '3TD, 1L', '3TD, 2L', '4TD, 1L'] },
  { key: 'ysmir', label: 'Ysmir, Terres galyrs', start: ['1TD, 1TH', '1TD, 1TH, 1L', '2TD, 1TH, 1L', '3TD, 1TH, 1L', '4TD, 1TH'] },
  { key: 'marne', label: 'Principauté de Marne', start: ['1TD, 1TH', '1TD, 2L', '1TD, 1TF, 2L', '2TD, 1TF, 2L', '3TD, 1TF, 1L'] },
  { key: 'jaspor', label: 'Jaspor', start: ['1TD, 1TH', '1TD, 2L', '1TD, 1TF, 2L', '2TD, 1TF, 2L', '3TD, 1TF, 1L'] },
  { key: 'zul', label: 'Empire Zûl', start: ['1TD, 1TH', '2TD, 1L', '3TD, 1L', '4TD, 1L', '4TD, 1L'] },
  { key: 'marchesAlyzees', label: 'Marches Alyzées', start: ['2L', '3L', '4L', '5L', '5L'] },
  { key: 'griff', label: 'Cité de Griff', start: ['2L', '3L', '4L', '5L', '5L'] },
] as const;

export type NationKey = (typeof NATIONS)[number]['key'];

export type TendanceStart = { fixed: Record<TendanceKey, number>; free: number };

const TENDANCE_CODES: Record<string, TendanceKey> = { TD: 'dragon', TF: 'fatalite', TH: 'homme' };

/** « 2TD, 1TH, 1L » → the fixed tendances and the free points. */
export function parseTendanceStart(cell: string): TendanceStart {
  const out: TendanceStart = { fixed: { dragon: 0, fatalite: 0, homme: 0 }, free: 0 };
  for (const [, n, code] of cell.matchAll(/(\d+)\s*(TD|TF|TH|L)/g)) {
    if (code === 'L') out.free += Number(n);
    else out.fixed[TENDANCE_CODES[code]] += Number(n);
  }
  return out;
}

/** A nation's starting tendances for an age (Adulte while none is chosen). */
export function tendanceStart(nation: NationKey, age: AgeKey | null): TendanceStart {
  const row = NATIONS.find((n) => n.key === nation)!;
  const i = AGE_BANDS.findIndex((b) => b.key === (age ?? DEFAULT_AGE.key));
  return parseTendanceStart(row.start[i]);
}
