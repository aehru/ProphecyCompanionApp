// Guided creation — the wizard's pure half: its steps, what blocks « Suivant »,
// the distribution mechanics and the build that turns choices into sheet
// values. The rulebook TABLES it reads live in `creation-rules` (shared with
// the NPC generator); this file only decides how the wizard applies them.
//
// The screens hold a plain `FormValues` (the same one the full form edits),
// and `applyBuild` writes the derived values into it, so a character made
// either way goes through `fromFormValues` and nothing else.

import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  MAX_PUCES,
  RESOURCES,
  TENDANCES,
  WOUND_LEVELS,
  type AttributKey,
  type CaracKey,
  type ResourceKey,
  type TraitKind,
} from '@/constants/prophecy';
import { clamp, type FormValues, parseInteger } from '@/lib/character-values';
import { traitPool, type TraitPool } from '@/lib/trait-pool';
import {
  ATTRIBUT_CARACS,
  type AgeKey,
  ageMod,
  attributModifier,
  initiativeDice,
  type NationKey,
  resourceStart,
  type TendanceStart,
  type WoundBoxes,
  woundBoxes,
} from '@/lib/creation-rules';

// The rulebook's creation order (« Concept » and « Augure de naissance » are
// not modelled yet), with Identité last before the recap: the name is the one
// required field, and it is easier to give once the character exists.
export const CREATION_STEPS = [
  { key: 'age', title: 'L’âge', short: 'Âge' },
  { key: 'caste', title: 'Votre caste', short: 'Caste' },
  { key: 'carac', title: 'Caractéristiques', short: 'Caractéristiques' },
  { key: 'attributs', title: 'Attributs', short: 'Attributs' },
  { key: 'tendances', title: 'Tendances', short: 'Tendances' },
  { key: 'desavantages', title: 'Désavantages', short: 'Désavantages' },
  { key: 'avantages', title: 'Avantages', short: 'Avantages' },
  { key: 'identite', title: 'Identité', short: 'Identité' },
  { key: 'recap', title: 'Récapitulatif', short: 'Récapitulatif' },
] as const;

/** Only the name is required, and only Identité asks for it. */
export function canLeaveStep(step: number, v: FormValues): boolean {
  return CREATION_STEPS[step]?.key !== 'identite' || v.nom.trim() !== '';
}

/** A stepper tap: the field moved by `delta`, never below 0. */
export const stepValue = (text: string, delta: number) =>
  String(clamp(parseInteger(text) + delta, 0));

/**
 * Tapping puce `index` (0-based) fills up to it; tapping the last filled one
 * again empties it, so a single puce can be cleared without a minus button.
 */
export function tapPuce(text: string, index: number): string {
  const next = parseInteger(text) === index + 1 ? index : index + 1;
  return String(clamp(next, 0, MAX_PUCES));
}

// ── Distribution (one value of a pool per key) ─────────────────────────────

type Assign<K extends string> = Partial<Record<K, number>>;

/** The pool values still to hand out, in pool order. */
export function remainingValues<K extends string>(
  pool: readonly number[],
  assign: Assign<K>,
): number[] {
  const left = [...pool];
  for (const n of Object.values<number | undefined>(assign)) {
    const i = left.indexOf(n as number);
    if (i >= 0) left.splice(i, 1);
  }
  return left;
}

/**
 * Give `value` to `key`. Tapping its current value takes it back. A value none
 * of which is left is SWAPPED with a key holding it, so moving a 7 around never
 * needs an « unassign » first.
 */
export function assignValue<K extends string>(
  pool: readonly number[],
  assign: Assign<K>,
  key: K,
  value: number,
): Assign<K> {
  const next = { ...assign };
  if (next[key] === value) {
    delete next[key];
    return next;
  }
  if (!remainingValues(pool, assign).includes(value)) {
    const holder = (Object.keys(next) as K[]).find((k) => k !== key && next[k] === value);
    if (!holder) return assign;
    if (next[key] == null) delete next[holder];
    else next[holder] = next[key];
  }
  next[key] = value;
  return next;
}

// ── The build: every choice the wizard turns into sheet values ─────────────

export type CreationBuild = {
  age: AgeKey | null;
  /** Which starting value each caractéristique took; absent = not yet. */
  assign: Assign<CaracKey>;
  /**
   * « Un point — et un seul » moved from one caractéristique to another. A side
   * is '' while the player has picked only the other one; only a full,
   * distinct pair moves anything.
   */
  transfer: { from: CaracKey | ''; to: CaracKey | '' } | null;
  /** Which of the age's attribut values each attribut took. */
  attributs: Assign<AttributKey>;
  /** The age's free Maîtrise / Chance points, as handed out (on top of its fixed ones). */
  resources: Partial<Record<ResourceKey, number>>;
  /** Nation d'origine — only proposes the tendances (see `proposeTendances`). */
  nation: NationKey | null;
  /** The désavantage taken in each slot of the age's quota (see `desavantageSlots`). */
  desavantages: Record<string, TraitChoice>;
  /** The avantages bought, in the order they were taken. */
  avantages: TraitChoice[];
};

/** A catalogue entry taken during creation, inserted as a `traits` row on « Démarrer ». */
export type TraitChoice = { presetId: string; cost: number; note: string };

/** The avantages pool of the choices so far — the same arithmetic as a sheet's. */
export function buildTraitPool(build: CreationBuild): TraitPool {
  return traitPool(chosenTraits(build).map((t) => ({ kind: t.kind, cost: t.cost })));
}

/** Every avantage / désavantage taken, with its side of the pool — what « Démarrer » inserts. */
export function chosenTraits(build: CreationBuild): (TraitChoice & { kind: TraitKind })[] {
  return [
    ...Object.values(build.desavantages).map((c) => ({ ...c, kind: 'desavantage' as const })),
    ...build.avantages.map((c) => ({ ...c, kind: 'avantage' as const })),
  ];
}

/**
 * A new age. The attribut values, the Maîtrise / Chance points and the
 * désavantage quota all depend on it, so a CHANGE starts them over; picking the
 * same age again keeps everything.
 */
export function withAge(build: CreationBuild, age: AgeKey): CreationBuild {
  if (age === build.age) return build;
  return { ...build, age, attributs: {}, resources: {}, desavantages: {} };
}

export const EMPTY_BUILD: CreationBuild = {
  age: null,
  assign: {},
  transfer: null,
  attributs: {},
  resources: {},
  nation: null,
  desavantages: {},
  avantages: [],
};

/**
 * A nation's starting tendances written into the form — a PROPOSAL: the fields
 * stay editable, and the puces are left alone (the table says nothing of them).
 */
export function proposeTendances(v: FormValues, start: TendanceStart): FormValues {
  const out = { ...v };
  for (const t of TENDANCES) out[t.key] = String(start.fixed[t.key]);
  return out;
}

/**
 * The table's free points (« L ») still to place: its total minus the tendances
 * as they stand. Negative once the player went past the table, which is shown,
 * never blocked.
 */
export function freeTendancesLeft(v: FormValues, start: TendanceStart): number {
  const total = start.free + TENDANCES.reduce((sum, t) => sum + start.fixed[t.key], 0);
  return total - TENDANCES.reduce((sum, t) => sum + parseInteger(v[t.key]), 0);
}

/** The age's free Maîtrise / Chance points not handed out yet. */
export function resourcePointsLeft(build: CreationBuild): number {
  const given = RESOURCES.reduce((sum, r) => sum + (build.resources[r.key] ?? 0), 0);
  return resourceStart(build.age).free - given;
}

/**
 * One free point onto (`delta` 1) or off (−1) a resource, kept between 0 and
 * what is left to hand out.
 */
export function stepResource(
  build: CreationBuild,
  key: ResourceKey,
  delta: number,
): CreationBuild['resources'] {
  const current = build.resources[key] ?? 0;
  const max = current + resourcePointsLeft(build);
  // Not `clamp`: its max of 0 means « uncapped », and 0 left is a real cap here.
  return { ...build.resources, [key]: Math.max(0, Math.min(max, current + delta)) };
}

/** The age's fixed points + the free ones handed out. */
export function finalResource(build: CreationBuild, key: ResourceKey): number {
  return (resourceStart(build.age).fixed[key] ?? 0) + (build.resources[key] ?? 0);
}

/** Starting value + age + the one transferred point, never below 0. Null until assigned. */
export function finalCarac(build: CreationBuild, key: CaracKey): number | null {
  const base = build.assign[key];
  if (base == null) return null;
  const t = build.transfer;
  const moved =
    t && t.from && t.to && t.from !== t.to ? (t.to === key ? 1 : 0) - (t.from === key ? 1 : 0) : 0;
  return Math.max(0, base + ageMod(build.age, key) + moved);
}

/** The two related caractéristiques' final sum (an unassigned one counts 0). */
export function attributCaracSum(build: CreationBuild, key: AttributKey): number {
  return ATTRIBUT_CARACS[key].reduce((sum, c) => sum + (finalCarac(build, c) ?? 0), 0);
}

/** Distributed value + modificateur, never below 0 (« un Attribut peut avoir 0 »). */
export function finalAttribut(build: CreationBuild, key: AttributKey): number | null {
  const base = build.attributs[key];
  if (base == null) return null;
  return Math.max(0, base + (attributModifier(attributCaracSum(build, key)) ?? 0));
}

/** INITIATIVE: dice from COO + PER, once both are handed out. */
export function buildInitiative(build: CreationBuild): number | null {
  const coo = finalCarac(build, 'coordination');
  const per = finalCarac(build, 'perception');
  return coo == null || per == null ? null : initiativeDice(coo, per);
}

/** SEUILS DE BLESSURE: wound boxes from RÉS + VOL, once both are handed out. */
export function buildWounds(build: CreationBuild): WoundBoxes | null {
  const res = finalCarac(build, 'resistance');
  const vol = finalCarac(build, 'volonte');
  return res == null || vol == null ? null : woundBoxes(res, vol);
}

/**
 * The form values with everything the build derives written in. Initiative and
 * wound boxes are only DEFAULTS: a number typed in « Ajuster » wins over them
 * (any wound field typed keeps the whole track as typed).
 */
export function applyBuild(v: FormValues, build: CreationBuild): FormValues {
  const out = { ...v };
  for (const c of CARACTERISTIQUES) {
    const n = finalCarac(build, c.key);
    if (n != null) out[c.key] = String(n);
  }
  for (const a of ATTRIBUTS) {
    const n = finalAttribut(build, a.key);
    if (n != null) out[a.key] = String(n);
  }
  const init = buildInitiative(build);
  if (init != null && !v.initiativeMax) out.initiativeMax = String(init);
  // Maîtrise / Chance once an age is chosen or a point handed out — and, like
  // the rest, only over blank fields.
  const resourcesTouched = build.age != null || Object.keys(build.resources).length > 0;
  if (resourcesTouched && !RESOURCES.some((r) => v[`${r.key}Max`])) {
    for (const r of RESOURCES) out[`${r.key}Max`] = String(finalResource(build, r.key));
  }
  const wounds = buildWounds(build);
  if (wounds && !WOUND_LEVELS.some((w) => v[`${w.key}Max`])) {
    for (const [k, n] of Object.entries(wounds)) out[k] = String(n);
  }
  return out;
}
