// What an enchantment's recorded roll means, once it is recorded.
//
// An enchant carries two stored numbers — the score the ENCHANTER rolled and the
// difficulté it was rolled against (see `enchants` in db/schema) — because the
// caster is usually not this character and there is nothing on the sheet to
// derive them from. Everything else is read off that pair, here, and never
// stored: réussite, the NR, and through the NR the durée and the number of
// cibles the sortilège locked in.
//
// The NR rule is the ONE in `lib/roll` — one per full step of 5 above the
// difficulté — imported rather than restated, so a rules change lands in both
// places at once.

import { NR_STEP } from '@/lib/roll';

export interface EnchantScoreReading {
  /** The score as rolled by whoever cast the sortilège into the object. */
  score: number;
  /** What it was rolled against. */
  difficulty: number;
  success: boolean;
  /**
   * Niveaux de réussite. `Math.floor`, not a rounding: 24 against 15 is 1 NR,
   * not 2. A failed enchantment reads 0 rather than a negative — how badly it
   * missed is the GM's business, exactly as in `resolveRoll`.
   */
  nr: number;
}

/**
 * Read an enchant's stored roll, or `null` when there is nothing to read.
 *
 * Both numbers are needed: a score alone answers no question, and a difficulté
 * alone is a spell's, not a roll's. Missing either — an enchant written as pure
 * flavour, or any row predating the columns — yields null, which is what every
 * caller renders as "no score recorded" rather than as a failure.
 *
 * A score BELOW the difficulté is a valid, storable reading: the mage tried and
 * botched it, and the sheet says so.
 */
export function enchantScoreReading(
  castScore: number | null | undefined,
  difficulty: number | null | undefined,
): EnchantScoreReading | null {
  if (castScore == null || difficulty == null) return null;
  const success = castScore >= difficulty;
  return {
    score: castScore,
    difficulty,
    success,
    nr: success ? Math.floor((castScore - difficulty) / NR_STEP) : 0,
  };
}
