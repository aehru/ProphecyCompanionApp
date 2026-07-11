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
 * Prophecy 2e initiative: roll `count` (= a character's `initiativeMax`) plain
 * D10, returned in decreasing order — the initiative grid reads highest-first,
 * each slot an action for the turn.
 */
export function rollInitiative(count: number, rng: Rng = Math.random): number[] {
  return rollDice(count, 10, rng).sort((a, b) => b - a);
}
