/**
 * Real dice roller — the deliberate exception to the app's otherwise "we never
 * roll" stance (see `lib/formula`, which keeps weapon dice symbolic). Feeds the
 * initiative roll (weapons tab) and the global XdY roller FAB. RNG is injectable
 * so the pure logic (range, count, ordering) stays unit-testable without stubbing
 * Math.random globally.
 */
export type Rng = () => number;

/** A single die in [1, sides]. sides < 1 → 1 (a d0 is meaningless). */
export function rollDie(sides: number, rng: Rng = Math.random): number {
  if (sides < 1) return 1;
  return Math.floor(rng() * sides) + 1;
}

/** `count` dice of `sides`, in roll order. count < 1 → []. */
export function rollDice(count: number, sides: number, rng: Rng = Math.random): number[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => rollDie(sides, rng));
}

/**
 * Prophecy 2e initiative: roll `count` (= a character's effective dice count,
 * see `initiativeDiceCount`) plain D10, returned in decreasing order — the
 * initiative grid reads highest-first, each slot an action for the turn.
 */
export function rollInitiative(count: number, rng: Rng = Math.random): number[] {
  return rollDice(count, 10, rng).sort((a, b) => b - a);
}

/**
 * How many dice a character actually rolls this turn: the sheet's
 * `initiativeMax` plus the in-play, signed `initiativeBonusDice`. Floors at 0 —
 * a bonus of -5 on 2 dice means no action, not a negative grid.
 *
 * The single reader of that pair: the Fiche grid, the GM's bulk roll and the
 * campaign projection all go through here so a die can't exist in one and not
 * the other.
 */
export function initiativeDiceCount(max: number, bonus: number): number {
  return Math.max(0, (max ?? 0) + (bonus ?? 0));
}

/**
 * Cut stored initiative values down to `count`. Called when the dice count
 * shrinks: without it a die dropped and later granted again would come back
 * showing its old roll, which reads as a real value the player never rolled.
 * Growing is not padded — the grid already renders a missing slot as 0.
 */
export function trimInitiativeValues(values: readonly number[], count: number): number[] {
  return values.length > count ? values.slice(0, Math.max(0, count)) : [...values];
}
