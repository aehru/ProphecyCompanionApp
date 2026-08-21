// The compétence a weapon is wielded with, and the total the player reads off
// its card: attribut + points + modificateurs.
//
// PURE (no React, no DB, no theme) so the arithmetic and the resolution rules —
// the fiddly part — are unit-testable.
//
// The link is NAME-KEYED (`weapons.skillName` → `skills.name`), like
// `skills.parentName` and the `skill:<name>` effect targets already are. A
// weapon can therefore point at a compétence the character has not bought:
// that is a real, playable state (you loot a bow before learning to shoot), so
// it resolves to the attribut alone rather than to nothing.

import { ATTRIBUT_LABEL, ATTRIBUTS, DEFAULT_SKILLS } from '@/constants/prophecy';
import { skillModifier, type ModifierSource } from '@/lib/modifiers';
import { fold } from '@/lib/text-fold';

/** The bits of a `skills` row this module reads. */
export interface WeaponSkillSource {
  name: string;
  attribut: string;
  value: number;
  parentName?: string | null;
  specLabel?: string | null;
}

/**
 * Why a weapon has no readable total, or the numbers when it does.
 *   `unset`   — no compétence linked (hand-made weapon, or a row predating the
 *               column). The card invites the player to pick one.
 *   `unknown` — a name that matches neither a saved skill nor the catalogue:
 *               a custom skill since deleted, or a renamed spécialisation.
 *   `ok`      — resolved. `trained` is false when the character has no points
 *               in it, in which case `value` is 0 and the total is the attribut
 *               plus modifiers (a raw roll is allowed).
 */
export type WeaponSkillReading =
  | { status: 'unset' }
  | { status: 'unknown'; name: string }
  | {
      status: 'ok';
      name: string;
      attribut: string;
      attributLabel: string;
      attributValue: number;
      value: number;
      bonus: number;
      total: number;
      trained: boolean;
    };

/**
 * Resolve a weapon's compétence against the character.
 *
 * Lookup order matters: a saved `skills` row wins (it carries the points, and
 * it is the only place a spécialisation or a custom skill exists), then the
 * default catalogue (which yields the attribut for a skill worth 0 points —
 * `replaceSkills` never persists those). Anything else is `unknown`.
 *
 * `bonus` is `skillModifier`, the exact function the Compétences tab and the
 * GM's COMP·MOD·TOT columns use, so a weapon's total can't drift from the
 * skill's own reading.
 */
export function weaponSkillReading(
  skillName: string | null | undefined,
  skills: readonly WeaponSkillSource[],
  attributs: Record<string, number>,
  effects: readonly ModifierSource[] = [],
  wound = 0,
): WeaponSkillReading {
  const name = (skillName ?? '').trim();
  if (name === '') return { status: 'unset' };

  const saved = skills.find((s) => s.name === name);
  const fallback = saved ? undefined : DEFAULT_SKILLS.find((d) => d.name === name);
  if (!saved && !fallback) return { status: 'unknown', name };

  const attribut = saved?.attribut ?? fallback!.attribut;
  const value = saved?.value ?? 0;
  const attributValue = attributs[attribut] ?? 0;
  // Effects targeting this skill match on the raw name, spécialisation
  // composite included — that IS the effect target the editor writes.
  const bonus = skillModifier(attribut, name, effects, wound);

  return {
    status: 'ok',
    name,
    attribut,
    attributLabel: ATTRIBUT_LABEL[attribut] ?? attribut,
    attributValue,
    value,
    bonus,
    total: attributValue + value + bonus,
    trained: value > 0,
  };
}

/** One attribut's worth of pickable compétences, for the editor's picker. */
export interface SkillOptionGroup {
  key: string;
  label: string;
  options: { name: string; attribut: string; value: number; trained: boolean }[];
}

/**
 * Every compétence the player may link a weapon to, grouped by attribut (in the
 * canonical ATTRIBUTS order) then A→Z.
 *
 * The whole catalogue is offered, not a combat subset: a bomb thrown with
 * Alchimie is a legitimate table ruling, and second-guessing the GM here would
 * only force a workaround. Spécialisations are left out — they are a second
 * step hanging off their mother (see `specializationsOf`), which keeps the
 * first list short and readable.
 *
 * Custom skills the character owns are merged in; base rows the character has
 * no points in still appear (from the catalogue), flagged `trained: false`.
 */
export function skillOptions(
  skills: readonly WeaponSkillSource[],
  query = '',
): SkillOptionGroup[] {
  const byName = new Map<string, WeaponSkillSource>();
  for (const s of skills) {
    if (s.parentName == null) byName.set(s.name, s);
  }

  const merged = new Map<string, { name: string; attribut: string; value: number }>();
  for (const d of DEFAULT_SKILLS) {
    const saved = byName.get(d.name);
    merged.set(d.name, {
      name: d.name,
      attribut: saved?.attribut ?? d.attribut,
      value: saved?.value ?? 0,
    });
  }
  for (const [name, s] of byName) {
    if (!merged.has(name)) merged.set(name, { name, attribut: s.attribut, value: s.value });
  }

  const q = fold(query.trim());
  const all = [...merged.values()].filter((s) => q === '' || fold(s.name).includes(q));

  return ATTRIBUTS.map((a) => ({
    key: a.key,
    label: a.label,
    options: all
      .filter((s) => s.attribut === a.key)
      .sort((x, y) => compareName(x.name, y.name))
      .map((s) => ({ ...s, trained: s.value > 0 })),
  })).filter((g) => g.options.length > 0);
}

/**
 * The character's spécialisations of one compétence — the second step of the
 * picker. Ordered by label so the list is stable as specs are added.
 */
export function specializationsOf(
  motherName: string,
  skills: readonly WeaponSkillSource[],
): WeaponSkillSource[] {
  return skills
    .filter((s) => s.parentName === motherName)
    .sort((x, y) => compareName(x.specLabel ?? x.name, y.specLabel ?? y.name));
}

// Sorted on the shared fold — « Équitation » lands under E — and compared with
// `<` rather than `localeCompare`, which reads engine-dependent Intl data.
function compareName(a: string, b: string): number {
  const fa = fold(a);
  const fb = fold(b);
  return fa < fb ? -1 : fa > fb ? 1 : 0;
}
