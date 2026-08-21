/**
 * Real dice roller — the deliberate exception to the app's otherwise "we never
 * roll" stance (see `lib/formula`, which keeps weapon dice symbolic). Feeds the
 * initiative roll (weapons tab) and the global XdY roller FAB. RNG is injectable
 * so the pure logic (range, count, ordering) stays unit-testable without stubbing
 * Math.random globally.
 */
import { TENDANCES } from '@/constants/prophecy';
import type { Rng } from '@/lib/rng';

export type { Rng };

/** A tendance's die, carrying which tendance it was rolled for. */
export type TendanceRoll = { key: (typeof TENDANCES)[number]['key']; value: number };

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
 * Cut a stored per-die array down to `count`. Called when the dice count
 * shrinks: without it a die dropped and later granted again would come back
 * showing its old roll (or its old icon), which reads as something the player
 * never set. Growing is not padded — the grid renders a missing slot as 0 / no
 * icon. Generic because values and icons are two arrays over the same slots.
 */
export function trimInitiativeSlots<T>(slots: readonly T[], count: number): T[] {
  return slots.length > count ? slots.slice(0, Math.max(0, count)) : [...slots];
}

/**
 * Sort dice highest-first, carrying each die's icon with its value.
 *
 * Once a die is marked ("this one is the off hand") the grid may not sort the
 * numbers alone — the icons would end up describing different dice. Sorting
 * PAIRS keeps the mark on its own roll, which also means a die's identity lives
 * on its icon and never on its index: nothing may key off slot position.
 *
 * `Array.prototype.sort` is stable (ES2019), so equal rolls keep their relative
 * order instead of shuffling the marks on every re-render.
 */
export function sortInitiativeSlots(
  values: readonly number[],
  icons: readonly string[],
): { values: number[]; icons: string[] } {
  const pairs = values.map((value, i) => ({ value, icon: icons[i] ?? '' }));
  pairs.sort((a, b) => b.value - a.value);
  return { values: pairs.map((p) => p.value), icons: pairs.map((p) => p.icon) };
}

/**
 * Roll `count` D10 and pair them with the slots' existing icons, highest-first.
 *
 * The icons are assigned by INDEX before the sort: slot i keeps the mark it had,
 * gets a fresh roll, and the pair then moves together. That is what makes a
 * re-roll readable — the off-hand die still shows the off-hand icon.
 */
export function rollInitiativeWithIcons(
  count: number,
  icons: readonly string[],
  rng: Rng = Math.random,
): { values: number[]; icons: string[] } {
  return sortInitiativeSlots(rollDice(count, 10, rng), icons);
}

/**
 * One D10 per tendance, in TENDANCES order.
 *
 * Prophecy lets a character roll the Dragon, the Fatalité and the Homme dice
 * together and KEEP whichever result suits the action — so the three are rolled
 * as one gesture and none of them is "the" result. Nothing is picked here: the
 * choice happens at the table, and the app has no roll history to record it in.
 */
export function rollTendances(rng: Rng = Math.random): TendanceRoll[] {
  return TENDANCES.map((t) => ({ key: t.key, value: rollDie(10, rng) }));
}
