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

import { WOUND_LEVELS } from '@/constants/prophecy';
import type { Effect } from '@/db/schema';

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
export function activeEffects(effects: Effect[]): Effect[] {
  return effects.filter((e) => !e.expired);
}

/**
 * Sum of active effect values that apply to `targetKey`: effects targeting that
 * exact stat plus effects targeting `'all'`. Does not include the wound malus.
 */
export function effectsSum(targetKey: string, effects: Effect[]): number {
  let total = 0;
  for (const e of effects) {
    if (e.expired) continue;
    if (e.target === targetKey || e.target === 'all') total += e.value;
  }
  return total;
}

/**
 * Total modifier for a roll using `targetKey`: wound malus + matching effects.
 * This is the number shown as a badge next to a caractéristique/attribut.
 */
export function totalModifier(targetKey: string, effects: Effect[], wound: number): number {
  return wound + effectsSum(targetKey, effects);
}

/** Format a signed modifier for display, e.g. 1 → "+1", -5 → "-5". */
export function fmtSignedMod(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
