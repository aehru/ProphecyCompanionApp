// Guided creation — the compétences: the caste's base profile (five slots
// scored 6 / 6 / 5 / 5 / 4), one spécialisation, and the Points de Compétence
// spent on top. Pure, like the rest of lib/creation; the screens hold a
// `SkillBuild` inside the wizard's `CreationBuild`.
//
// Every score is keyed by an option id from `skill-profiles` — a compétence's
// name, or `discipline:<key>` / `sphere:<key>` for the magic scores, which are
// character columns rather than skill rows (`magicField`).

import { skillAttribut } from '@/constants/prophecy';
import type { FormValues } from '@/lib/character-values';
import { assignValue } from '@/lib/distribution';
import {
  type AgeKey,
  type ExperienceTier,
  skillCost,
  skillMax,
  skillPoints,
} from '@/lib/creation-rules';
import { skillCostFactor } from '@/lib/skill-access';
import { magicField, PROFILE_VALUES } from '@/lib/skill-profiles';
import type { NewSkillInput } from '@/repositories/skills';

export type SkillBuild = {
  /** The caste the profile below was filled for — another caste starts it over. */
  caste: string;
  /** Slot index → the option it was filled with. */
  choices: Record<string, string>;
  /** Slot index → the base score it took. */
  values: Partial<Record<string, number>>;
  /** Option id → the score the free points raised it to. */
  raised: Record<string, number>;
  /** The one creation spécialisation: its mother compétence, label and score. */
  spec: { parent: string; label: string; score: number } | null;
  tier: ExperienceTier;
};

export const EMPTY_SKILLS: SkillBuild = {
  caste: '',
  choices: {},
  values: {},
  raised: {},
  spec: null,
  tier: 'normal',
};

/** The profile part, or an empty one when it was filled for another caste. */
function profileOf(s: SkillBuild, caste: string) {
  return s.caste === caste ? s : { choices: {}, values: {} as SkillBuild['values'] };
}

/** Option id → base score, from the profile slots that are both chosen and scored. */
export function baseScores(s: SkillBuild, caste: string): Record<string, number> {
  const p = profileOf(s, caste);
  const out: Record<string, number> = {};
  for (const [slot, id] of Object.entries(p.choices)) {
    const n = p.values[slot];
    if (n != null) out[id] = n;
  }
  return out;
}

/** Fill a slot. An option already taken in another slot moves here (a compétence is scored once). */
export function chooseProfileOption(s: SkillBuild, caste: string, slot: number, id: string): SkillBuild {
  const p = profileOf(s, caste);
  const choices = { ...p.choices };
  for (const [k, v] of Object.entries(choices)) if (v === id) delete choices[k];
  choices[slot] = id;
  return { ...s, caste, choices, values: p.values };
}

/** Give a slot one of the 6 / 6 / 5 / 5 / 4 (same swap rule as the caractéristiques). */
export function scoreProfileSlot(s: SkillBuild, caste: string, slot: number, n: number): SkillBuild {
  const p = profileOf(s, caste);
  return { ...s, caste, choices: p.choices, values: assignValue(PROFILE_VALUES, p.values, String(slot), n) };
}

/** A score as it stands: the base, or what the free points raised it to. */
export function skillScore(s: SkillBuild, caste: string, id: string): number {
  return Math.max(baseScores(s, caste)[id] ?? 0, s.raised[id] ?? 0);
}

/** A free-points tap: one step up or down, never under the base nor over the age's limit. */
export function stepSkill(
  s: SkillBuild,
  caste: string,
  age: AgeKey | null,
  id: string,
  delta: number,
): SkillBuild {
  const base = baseScores(s, caste)[id] ?? 0;
  const next = Math.min(skillMax(age), Math.max(base, skillScore(s, caste, id) + delta));
  const raised = { ...s.raised };
  if (next > base) raised[id] = next;
  else delete raised[id];
  return { ...s, raised };
}

/** Where the spécialisation starts: its mother's score once the profile is set. */
export const specBase = (s: SkillBuild, caste: string) =>
  s.spec ? (baseScores(s, caste)[s.spec.parent] ?? 0) : 0;

/** Pick (or relabel) the spécialisation; a new mother starts it at that mother's base. */
export function setSpec(
  s: SkillBuild,
  caste: string,
  parent: string | null,
  label = '',
): SkillBuild {
  if (!parent) return { ...s, spec: null };
  const same = s.spec?.parent === parent;
  const score = same ? s.spec!.score : (baseScores(s, caste)[parent] ?? 0);
  return { ...s, spec: { parent, label, score } };
}

/** Raise or lower the spécialisation, between its starting score and the age's limit. */
export function stepSpec(s: SkillBuild, caste: string, age: AgeKey | null, delta: number): SkillBuild {
  if (!s.spec) return s;
  const score = Math.min(skillMax(age), Math.max(specBase(s, caste), s.spec.score + delta));
  return { ...s, spec: { ...s.spec, score } };
}

/** A raise from `from` to `to`, priced on the COÛT table — doubled for a réservée / interdite. */
export const raiseCost = (id: string, caste: string, from: number, to: number) =>
  skillCost(from, to) * skillCostFactor(id, caste);

/**
 * Points de Compétence spent: every raise priced by `raiseCost` from its
 * base, plus the spécialisation's raise at half price (« divisé par deux,
 * arrondi au supérieur » — the spécialisation itself costs nothing to take).
 */
export function skillPointsSpent(s: SkillBuild, caste: string): number {
  const base = baseScores(s, caste);
  let spent = 0;
  for (const [id, score] of Object.entries(s.raised)) spent += raiseCost(id, caste, base[id] ?? 0, score);
  if (s.spec) spent += Math.ceil(raiseCost(s.spec.parent, caste, specBase(s, caste), s.spec.score) / 2);
  return spent;
}

/** Points de Compétence still to spend (negative = over budget, shown not blocked). */
export function skillPointsLeft(s: SkillBuild, caste: string, age: AgeKey | null): number {
  return skillPoints(age, s.tier) - skillPointsSpent(s, caste);
}

/** Every option id that ends with a score: the profile's and the raised ones. */
function scoredIds(s: SkillBuild, caste: string): string[] {
  return [...new Set([...Object.keys(baseScores(s, caste)), ...Object.keys(s.raised)])];
}

/** The magic scores written into the form (Disciplines and Sphères are columns). */
export function applySkills(v: FormValues, s: SkillBuild, caste: string): FormValues {
  const out = { ...v };
  for (const id of scoredIds(s, caste)) {
    const field = magicField(id);
    if (field) out[field] = String(skillScore(s, caste, id));
  }
  return out;
}

/** The `skills` rows « Démarrer » inserts: each scored compétence, then the spécialisation. */
export function skillRows(
  s: SkillBuild,
  caste: string,
  specName: (mother: string, label: string) => string,
): NewSkillInput[] {
  const rows: NewSkillInput[] = scoredIds(s, caste)
    .filter((id) => magicField(id) == null)
    .map((id) => ({ name: id, attribut: skillAttribut(id), value: skillScore(s, caste, id) }))
    .filter((r) => r.value > 0);
  if (s.spec && s.spec.score > 0) {
    rows.push({
      name: specName(s.spec.parent, s.spec.label),
      attribut: skillAttribut(s.spec.parent),
      value: s.spec.score,
      parentName: s.spec.parent,
      specLabel: s.spec.label.trim(),
    });
  }
  return rows;
}
