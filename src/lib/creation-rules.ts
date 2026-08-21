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

import { WOUND_LEVELS } from '@/constants/prophecy';

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
const WOUND_BANDS: { min: number; boxes: WoundBoxes }[] = [
  { min: 0, boxes: { egratignureMax: 2, legereMax: 1, graveMax: 1, fataleMax: 1, mortMax: 1 } },
  { min: 5, boxes: { egratignureMax: 3, legereMax: 2, graveMax: 1, fataleMax: 1, mortMax: 1 } },
  { min: 10, boxes: { egratignureMax: 3, legereMax: 2, graveMax: 2, fataleMax: 1, mortMax: 1 } },
  { min: 15, boxes: { egratignureMax: 3, legereMax: 3, graveMax: 2, fataleMax: 2, mortMax: 1 } },
  { min: 20, boxes: { egratignureMax: 3, legereMax: 4, graveMax: 3, fataleMax: 2, mortMax: 1 } },
];

/**
 * RÉS + VOL → the character's wound track.
 *
 * The last band (20+) is open-ended: the rulebook's table stops at 24, and
 * nothing says what a higher score gives. Clamping to the top row keeps a
 * generated legend legal instead of inventing a sixth band — the same choice
 * `casteFromInput` makes for an unknown caste, rather than throwing.
 *
 * A negative or missing score reads as 0 (the weakest band), so a half-filled
 * sheet still yields a usable track.
 */
export function woundBoxes(resistance: number, volonte: number): WoundBoxes {
  const score = Math.max(0, Math.round((resistance || 0) + (volonte || 0)));
  let match = WOUND_BANDS[0];
  for (const band of WOUND_BANDS) {
    if (score >= band.min) match = band;
  }
  return { ...match.boxes };
}

/**
 * Initiative dice by COORDINATION + PERCEPTION, same band shape as the wound
 * track. `min` is inclusive and a band runs until the next one starts.
 *
 * The steps are 4 wide, then 3 — irregular again, so again a table.
 */
const INITIATIVE_BANDS: { min: number; dice: number }[] = [
  { min: 2, dice: 1 },
  { min: 6, dice: 2 },
  { min: 10, dice: 3 },
  { min: 14, dice: 4 },
  { min: 17, dice: 5 },
];

/**
 * COO + PER → how many actions the character gets per turn.
 *
 * Clamped at both ends: the table starts at 2 (the lowest a pair of scored
 * caractéristiques can reach) and stops at 19, so a 20 keeps the top row rather
 * than inventing a sixth die. One action is the floor — a character who cannot
 * act is not a weak character, it is an unusable sheet.
 */
export function initiativeDice(coordination: number, perception: number): number {
  const score = Math.max(0, Math.round((coordination || 0) + (perception || 0)));
  let dice = INITIATIVE_BANDS[0].dice;
  for (const band of INITIATIVE_BANDS) {
    if (score >= band.min) dice = band.dice;
  }
  return dice;
}

/** Total boxes across every level — the "how much can this one take" one-liner. */
export function totalWoundBoxes(boxes: WoundBoxes): number {
  return WOUND_LEVELS.reduce((sum, level) => sum + boxes[`${level.key}Max` as keyof WoundBoxes], 0);
}
