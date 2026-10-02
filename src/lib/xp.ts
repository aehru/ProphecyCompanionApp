import { VALEUR_KEYS, type ValeurKey } from '@/constants/prophecy';

/**
 * Expérience — the arithmetic around the two stored counters
 * (`actual_state.xpTotal` / `xpSpent`).
 *
 * Only the two counters are stored; the disponible is derived here and nowhere
 * else, because a third stored number would be one more thing to keep in step.
 *
 * The disponible MAY be negative, and that is not an error state: the app has
 * no rulebook cost table (spending is typed in by hand), so a player who has
 * agreed a purchase with the GM records it whatever the balance says. Callers
 * clamp the two COUNTERS at zero — neither an award nor a spend can be
 * negative — and leave the difference alone.
 */

/** Unspent XP. Negative when more has been spent than earned (allowed). */
export const xpAvailable = (total: number, spent: number) => total - spent;

/** The five Valeur scores of one scénario, keyed like `VALEURS`. */
export type ValeurScores = Record<ValeurKey, number>;

/** One scénario's award: every score once, the chosen Valeur's twice. */
export function awardTotal(row: ValeurScores & { chosenValeur: ValeurKey }): number {
  return VALEUR_KEYS.reduce((sum, k) => sum + row[k], 0) + row[row.chosenValeur];
}

/**
 * Everything earned: the hand-typed base (`xpTotal`, « XP initiale » — what the
 * sheet held before scénarios were tracked) plus every CLOSED scénario. An open
 * one has no scores yet, and counting its zeros would be harmless but its
 * chosen Valeur would be read as settled.
 */
export function xpEarned(
  base: number,
  awards: readonly (ValeurScores & { chosenValeur: ValeurKey; endedAt: Date | null })[],
): number {
  return awards.reduce((sum, a) => (a.endedAt ? sum + awardTotal(a) : sum), base);
}

/** A GM score is 0–5; anything typed outside lands on the nearest bound. */
export const clampScore = (n: number) => Math.min(5, Math.max(0, Math.trunc(n) || 0));
