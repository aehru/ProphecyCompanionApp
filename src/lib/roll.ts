/**
 * The Prophecy test: D10 against a difficulté, read in NR.
 *
 * PURE (no React, no DB) like the other engines — the whole rule set is here so
 * a disagreement at the table can be settled by reading one file.
 *
 * The rules, in the order they apply:
 *
 *   total   = the dice's share + Σ context parts (+ CRIT_BONUS on a confirmed 10)
 *   réussite when total ≥ difficulté
 *   NR      = one per full step of 5 ABOVE the difficulté — 15 succeeds at 0 NR,
 *             20 is 1 NR, 25 is 2 NR
 *
 * Usually one die, sometimes several: an effect may let you throw two and keep
 * the better, another may let you add them up (see {@link DiceMode}). Whatever
 * the count, **exactly one die can crit or fumble** — the one kept, or the FIRST
 * thrown when summing; the rest are neutral however they land. Without that rule
 * a handful of dice would make a critique a formality.
 *
 * A 10 and a 1 each call for ONE reroll, never a cascade, and the reroll never
 * adds to the die: it only decides whether the result is confirmed. A confirmed
 * 10 is a critique worth +5, i.e. exactly one more NR. A confirmed 1 is an échec
 * critique — a FLAG, not an arithmetic penalty: the total stands as rolled and
 * what it costs is the GM's business, not the app's.
 */

/**
 * What several dice mean. Both exist because effects grant both: one may let you
 * throw two and keep the better, another may let you add them together.
 *
 * - `keep` — the extras are alternatives; the player picks the one that stands.
 *   The tendance trio is this mode with three coloured dice.
 * - `sum` — the dice add up into one bigger die.
 */
export type DiceMode = 'keep' | 'sum';

/** One term of a roll's context: a stat, a skill total, a tendance die kept. */
export interface RollPart {
  label: string;
  value: number;
}

/**
 * What a roll is made against.
 *
 * `parts` is a LIST, not a single number and not a pair: a test can be a skill
 * total on its own, an attribut + caractéristique (MEN + VOL), or either of
 * those plus a tendance die. Summing a list costs nothing and means the shape
 * never has to change again.
 *
 * `confirm` is separate on purpose, and it is NOT the sum. The confirmation die
 * is read against **the compétence, or the caractéristique** — never a total,
 * never an attribut, never a tendance die. A skill roll confirms on the points
 * bought, not on its TOT: a 12 can't be undercut by a D10, so confirming there
 * would make every 10 a critique. On a MEN + VOL + Dragon test it is VOL — the
 * caractéristique — that the reroll answers to. The number therefore does not
 * follow from `parts` (a skill's TOT is in the sum while its points are not), so
 * the caller states it and the engine never has to guess.
 */
export interface RollContext {
  /** What is being rolled, as the player would say it: « Équitation ». */
  label: string;
  parts: RollPart[];
  /** The value the confirmation die is read against. */
  confirm: number;
  /** What that number is, for the explanation line: « Compétence ». */
  confirmLabel?: string;
  /**
   * How many D10 to throw. Some traits grant a second die on a whole family of
   * rolls, « 2 dés sur tout ce qui touche au MENTAL »; nothing on the sheet
   * models those yet, so this is only the starting value of a field the player
   * can change. It is here so that when traits do land, the builder sets it and
   * no screen has to learn the rule twice.
   */
  dice?: number;
  /** Whether those extra dice are alternatives or addends. Same story as `dice`. */
  diceMode?: DiceMode;
  /**
   * What the difficulté field starts at, when the thing being rolled knows its
   * own — a spell carries one on the sheet. Everything else opens at
   * {@link DEFAULT_DIFFICULTY}, and the GM can always overrule the field.
   */
  difficulty?: number;
}

/** The difficulté a test starts at when the GM hasn't said otherwise. */
export const DEFAULT_DIFFICULTY = 15;
/** How far above the difficulté one NR costs. */
export const NR_STEP = 5;
/** What a confirmed critique adds — one NR's worth. */
export const CRIT_BONUS = NR_STEP;
/** Prophecy rolls a D10 and nothing else. */
export const DIE_SIDES = 10;

/** A test is one die unless something grants more. */
export const DEFAULT_DICE = 1;
/** A sane ceiling for the dice field — a test is never a fistful. */
export const MAX_DICE = 5;

/** Clamp whatever was typed into the dice field to a throwable count. */
export function diceCount(input: number): number {
  if (!Number.isFinite(input)) return DEFAULT_DICE;
  return Math.min(MAX_DICE, Math.max(DEFAULT_DICE, Math.floor(input)));
}

/**
 * One throw of the dice, before the rules read it.
 *
 * **Index 0 is not just the first die, it is the only one that can crit or
 * fumble.** When several dice are thrown at once the others are neutral,
 * whatever they come up — otherwise a fistful of dice would turn a critique into
 * a formality. That makes the throw ORDER meaningful: nothing may sort `dice`.
 */
export interface RollThrow {
  dice: number[];
  mode: DiceMode;
  /** `keep` only: which die stands. null until the player has chosen. */
  keptIndex: number | null;
}

/** The one-die throw every ordinary test is. */
export function singleThrow(die: number): RollThrow {
  return { dice: [die], mode: 'keep', keptIndex: 0 };
}

/**
 * The die the RULES read — the one a 10 or a 1 is about.
 *
 * In `sum` it is always the first die thrown; in `keep` it is the one kept, so
 * there is none until the player picks. Never the sum itself: a 10 means the
 * face, and 7 + 3 is not a 10.
 */
export function naturalDie(t: RollThrow): number | null {
  if (t.mode === 'sum') return t.dice[0] ?? null;
  return t.keptIndex == null ? null : (t.dice[t.keptIndex] ?? null);
}

/** True for the dice that are along for the ride and cannot crit or fumble. */
export function isNeutralDie(t: RollThrow, index: number): boolean {
  if (t.dice.length < 2) return false;
  return t.mode === 'sum' ? index > 0 : t.keptIndex !== index;
}

/** What the dice contribute to the total, or null while a `keep` awaits its pick. */
export function throwTotal(t: RollThrow): number | null {
  if (t.mode === 'sum') return t.dice.reduce((sum, d) => sum + d, 0);
  return t.keptIndex == null ? null : (t.dice[t.keptIndex] ?? null);
}

export interface RollResult {
  /** Every die thrown, in throw order. */
  dice: number[];
  mode: DiceMode;
  keptIndex: number | null;
  /** The die the rules read: first thrown, or the one kept. */
  natural: number;
  /** The dice's share of the total — the sum, or the kept die alone. */
  diceTotal: number;
  /** The reroll, once it has been made. null = not rolled (or not called for). */
  confirmDie: number | null;
  /** A 10 confirmed by a reroll STRICTLY under `confirm`. */
  critical: boolean;
  /** A 1 confirmed by a reroll STRICTLY over `confirm`. */
  fumble: boolean;
  /** CRIT_BONUS on a confirmed critique, else 0. */
  bonus: number;
  total: number;
  difficulty: number;
  success: boolean;
  /** Only ever positive on a success — a failure has no degree here. */
  nr: number;
}

/** The context's contribution to the total. */
export function contextValue(ctx: RollContext): number {
  return ctx.parts.reduce((sum, p) => sum + p.value, 0);
}

/** True when the die calls for a confirmation reroll: a 10 or a 1. */
export function needsConfirmation(die: number): boolean {
  return die === DIE_SIDES || die === 1;
}

/**
 * True while a roll is still owed its confirmation — the die the rules read
 * asked for a reroll and it hasn't been made. Here rather than in the dialog
 * because "is this roll finished" is a rule, and the UI should not be the second
 * place that knows it.
 */
export function awaitsConfirmation(t: RollThrow | null, confirmDie: number | null): boolean {
  if (t == null || confirmDie != null) return false;
  const die = naturalDie(t);
  return die != null && needsConfirmation(die);
}

/**
 * Read a throw against a context and a difficulté.
 *
 * Returns null while the throw isn't settled — a `keep` whose die hasn't been
 * picked has no result yet, and saying so here keeps the UI from having to know
 * why. Otherwise safe to call at any point: `confirmDie` is null until the
 * player asks for the reroll, an unconfirmed 10 is simply a 10, and editing the
 * difficulté re-reads the same dice rather than rolling new ones — the verdict
 * moves, the dice don't.
 */
export function resolveRoll(
  t: RollThrow,
  ctx: RollContext,
  difficulty: number,
  confirmDie: number | null = null,
): RollResult | null {
  const diceTotal = throwTotal(t);
  const natural = naturalDie(t);
  if (diceTotal == null || natural == null) return null;

  // Read off the natural die, never the sum: 7 + 3 is a total of 10 and not a
  // face of 10, and only a face can be confirmed.
  const critical = natural === DIE_SIDES && confirmDie != null && confirmDie < ctx.confirm;
  const fumble = natural === 1 && confirmDie != null && confirmDie > ctx.confirm;
  const bonus = critical ? CRIT_BONUS : 0;
  const total = diceTotal + contextValue(ctx) + bonus;
  const success = total >= difficulty;
  return {
    dice: t.dice,
    mode: t.mode,
    keptIndex: t.keptIndex,
    natural,
    diceTotal,
    confirmDie,
    critical,
    fumble,
    bonus,
    total,
    difficulty,
    success,
    // Math.floor, not a rounding: 24 against 15 is 1 NR, not 2. A failure gets 0
    // rather than a negative — how badly you missed is the GM's call.
    nr: success ? Math.floor((total - difficulty) / NR_STEP) : 0,
  };
}
