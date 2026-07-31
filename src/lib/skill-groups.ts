// Grouping a shared character's trained skills for the GM's reading, and the
// three columns they read off: COMP · MOD · TOT.
//
// PURE (no React, no DB, no theme) so the arithmetic is unit-testable. The
// colours are passed in by the caller; everything else comes from the
// projection.

import { ATTRIBUTS } from '@/constants/prophecy';
import { skillTarget } from '@/lib/modifiers';

/** A trained skill as the projection carries it (see lib/character-share). */
export interface SharedSkill {
  name: string;
  attribut: string;
  value: number;
  parentName?: string | null;
  specLabel?: string | null;
}

/** The bits of an active effect that matter to a skill roll. */
export interface SharedEffect {
  target?: string;
  value?: number;
}

export interface SkillGroup {
  key: string;
  label: string;
  color: string;
  attrVal: number;
  skills: {
    key: string;
    name: string;
    isSpec: boolean;
    value: number;
    bonus: number;
    total: number;
  }[];
}

/**
 * Net active bonus/malus applying to a skill roll: effects targeting `'all'`,
 * the skill's attribut, or that skill by name (`skill:<name>`). Wound malus is
 * NOT included (wounds aren't part of the GM projection / display). Mirrors
 * lib/modifiers `skillModifier` minus the wound term.
 */
export function skillBonus(attribut: string, name: string, effects: SharedEffect[]): number {
  const skillKey = skillTarget(name);
  let sum = 0;
  for (const e of effects) {
    if (e.target === 'all' || e.target === attribut || e.target === skillKey) sum += e.value ?? 0;
  }
  return sum;
}

/**
 * Group a character's trained skills by attribut (in the canonical ATTRIBUTS
 * order) and compute the three GM columns per skill:
 *   value  — the raw skill points
 *   bonus  — net active bonus/malus (effects on all / attribut / this skill)
 *   total  — value + attribut value + bonus (the roll base the GM reads off)
 * Optionally filtered by a search query. Specializations (parentName set) render
 * as their own rows labelled by specLabel; effect matching still uses the raw
 * skill name. Empty groups are dropped.
 */
export function groupSkills(
  skills: SharedSkill[],
  attributs: Record<string, number>,
  colors: Record<string, string>,
  query = '',
  effects: SharedEffect[] = [],
): SkillGroup[] {
  const q = query.trim().toLowerCase();
  return ATTRIBUTS.map((a) => {
    const attrVal = attributs[a.key] ?? 0;
    const rows = skills
      .filter((s) => s.attribut === a.key)
      .filter((s) => {
        if (q === '') return true;
        const hay = `${s.name} ${s.specLabel ?? ''} ${s.parentName ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .map((s) => {
        const isSpec = !!s.parentName;
        const name = isSpec ? (s.specLabel ?? s.name) : s.name;
        const bonus = skillBonus(a.key, s.name, effects);
        return {
          key: `${s.name}·${s.specLabel ?? ''}`,
          name,
          isSpec,
          value: s.value,
          bonus,
          total: s.value + attrVal + bonus,
        };
      });
    return { key: a.key, label: a.label, color: colors[a.key], attrVal, skills: rows };
  }).filter((g) => g.skills.length > 0);
}
