// Roll-modifier engine for Prophecy. Two sources stack on any dice roll:
//   1. Wound malus — derived live from the character's filled wound boxes. It hits
//      EVERY roll and is the single BIGGEST active wound level's malus (max, not
//      sum): a Fatale (-5) and a Légère (-1) together still give -5.
//   2. Temporary effects — `effects` rows with a signed value. These DO stack
//      additively. An effect targeting `'all'` hits every roll; one targeting a
//      caractéristique/attribut key only hits rolls using that stat.
//
// A roll's total modifier for a given stat = woundMalus + Σ(effects on that stat
// or on 'all'). Expired effects are ignored.
//
// A skill roll can ALSO carry an effect targeting that one skill. Skills have no
// stable key (replaceSkills re-inserts rows, so ids churn), so a skill effect
// stores its target as `skill:<name>` — see the `skill*` helpers below.

import { WOUND_LEVELS } from '@/constants/prophecy';

/**
 * The only three fields a modifier computation reads off an effect. Structural
 * on purpose: an `Effect` row and a projection's effect entry (see
 * lib/character-share) both satisfy it, so the GM's views of a shared character
 * fold in wounds and effects through this exact engine rather than a second
 * copy of the arithmetic. A projection carries only active effects, hence
 * `expired` being optional (absent → not expired).
 */
export interface ModifierSource {
  target?: string;
  value?: number;
  expired?: boolean | null;
}

/** Prefix marking an effect target as a single named skill (vs a stat key). */
export const SKILL_TARGET_PREFIX = 'skill:';

/** Build the effect target for a named skill. */
export function skillTarget(name: string): string {
  return `${SKILL_TARGET_PREFIX}${name}`;
}

/** True when an effect target points at a named skill rather than a stat. */
export function isSkillTarget(target: string): boolean {
  return target.startsWith(SKILL_TARGET_PREFIX);
}

/** The skill name behind a `skill:<name>` target (unchanged if not a skill target). */
export function skillTargetName(target: string): string {
  return isSkillTarget(target) ? target.slice(SKILL_TARGET_PREFIX.length) : target;
}

/**
 * Biggest active wound malus for a character, as a non-positive number (0 = no
 * malus). A wound level is "active" when it has at least one filled box
 * (`${key}Current` > 0). Returns the most negative malus among active levels.
 */
export function woundMalus(stRec: Record<string, number>): number {
  let worst = 0;
  for (const w of WOUND_LEVELS) {
    if (w.malus == null) continue;
    const filled = stRec[`${w.key}Current`] ?? 0;
    if (filled <= 0) continue;
    const m = Number(w.malus);
    if (m < worst) worst = m;
  }
  return worst;
}

/** Effects that currently count toward modifiers (not expired). */
export function activeEffects<T extends ModifierSource>(effects: readonly T[]): T[] {
  return effects.filter((e) => !e.expired);
}

/**
 * Sum of active effect values that apply to `targetKey`: effects targeting that
 * exact stat plus effects targeting `'all'`. Does not include the wound malus.
 */
export function effectsSum(targetKey: string, effects: readonly ModifierSource[]): number {
  let total = 0;
  for (const e of effects) {
    if (e.expired) continue;
    if (e.target === targetKey || e.target === 'all') total += e.value ?? 0;
  }
  return total;
}

/**
 * The part of a stat's modifier that belongs to THAT stat alone: effects
 * targeting the exact key, with `'all'` and the wound malus left out.
 *
 * A Prophecy roll adds an attribut to a caractéristique, so anything hitting
 * every roll would be drawn twice — once per tile — and read as double. Those
 * global sources are shown once, apart (see `globalModifier`); a tile badge
 * carries only what is specific to it.
 */
export function statModifier(targetKey: string, effects: readonly ModifierSource[]): number {
  let total = 0;
  for (const e of effects) {
    if (e.expired) continue;
    if (e.target === targetKey) total += e.value ?? 0;
  }
  return total;
}

/** The two sources that apply to EVERY roll, kept apart so each is readable. */
export interface GlobalModifier {
  /** Worst active wound level's malus (non-positive). */
  wound: number;
  /** Sum of the effects targeting `'all'`. */
  effects: number;
}

/**
 * The modifiers that apply to every roll, whatever stat it uses: the wound
 * malus and the `'all'`-targeted effects. Shown once per character rather than
 * on each stat — see `statModifier` for why.
 */
export function globalModifier(
  effects: readonly ModifierSource[],
  wound: number,
): GlobalModifier {
  return { wound, effects: statModifier('all', effects) };
}

/**
 * Total modifier for a roll using `targetKey`: wound malus + matching effects.
 * The full arithmetic for one roll — use it to COMPUTE a value (a skill total,
 * a damage formula), not to badge a stat tile.
 */
export function totalModifier(
  targetKey: string,
  effects: readonly ModifierSource[],
  wound: number,
): number {
  return wound + effectsSum(targetKey, effects);
}

/**
 * Net modifier for a skill roll: the modifier on its linked attribut (wound +
 * effects on that attribut or 'all') plus any effect targeting this skill by
 * name. This is the badge shown next to a skill's total.
 */
export function skillModifier(
  attribut: string,
  skillName: string,
  effects: readonly ModifierSource[],
  wound: number,
): number {
  // Only the effects targeting this exact skill — the 'all' + attribut effects
  // are already covered by totalModifier, so don't count them twice.
  const target = skillTarget(skillName);
  let skillOnly = 0;
  for (const e of effects) {
    if (!e.expired && e.target === target) skillOnly += e.value ?? 0;
  }
  return totalModifier(attribut, effects, wound) + skillOnly;
}

/** Format a signed modifier for display, e.g. 1 → "+1", -5 → "-5". */
export function fmtSignedMod(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
