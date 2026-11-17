/**
 * Real dice roller — the deliberate exception to the app's otherwise "we never
 * roll" stance (see `lib/formula`, which keeps weapon dice symbolic). Feeds the
 * initiative roll (weapons tab) and the global XdY roller FAB. RNG is injectable
 * so the pure logic (range, count, ordering) stays unit-testable without stubbing
 * Math.random globally.
 */
import { TENDANCES, type TendanceKey } from '@/constants/prophecy';
import type { Rng } from '@/lib/rng';

export type { Rng };

/** A tendance's die, carrying which tendance it was rolled for. */
export type TendanceRoll = { key: TendanceKey; value: number };

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
 * The one initiative roll: every EMPTY slot (missing or 0) up to `count` gets a
 * D10, then all slots sort highest-first.
 *
 * - **A full roll** passes no values: every slot is empty, every die is rolled.
 * - **Dice gained mid-turn** (« Dés supplémentaires » raised after the roll — a
 *   second weapon drawn, a spell landing) pass the turn's values: only the new
 *   slots roll, and they join the others exactly like a natural die.
 *
 * A slot's number, its mark (`icons`) and what it was spent on (`usage`) are
 * assigned by INDEX before the sort and move TOGETHER through it — sorting the
 * numbers alone would leave the off-hand icon or an « Attaque » describing a
 * different die. A die's identity therefore lives on its mark, never on its
 * index. `Array.prototype.sort` is stable (ES2019), so equal rolls keep their
 * relative order instead of shuffling the marks.
 */
export function rollInitiative<U>(
  count: number,
  values: readonly number[],
  icons: readonly string[],
  usage: readonly (U | null)[],
  rng: Rng = Math.random,
): { values: number[]; icons: string[]; usage: (U | null)[] } {
  const slots = Array.from({ length: Math.max(0, count) }, (_, i) => ({
    value: (values[i] ?? 0) > 0 ? values[i] : rollDie(10, rng),
    icon: icons[i] ?? '',
    use: usage[i] ?? null,
  }));
  slots.sort((a, b) => b.value - a.value);
  return {
    values: slots.map((s) => s.value),
    icons: slots.map((s) => s.icon),
    usage: slots.map((s) => s.use),
  };
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
