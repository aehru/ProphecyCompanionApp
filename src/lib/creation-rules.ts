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

/**
 * A rulebook band table: `min` is a row's lower bound, inclusive, and a row runs
 * until the next one starts. Both derivations below are read this way, so the
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
