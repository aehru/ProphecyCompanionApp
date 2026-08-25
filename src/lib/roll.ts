/**
 * The Prophecy test: one D10 against a difficulté, read in NR.
 *
 * PURE (no React, no DB) like the other engines — the whole rule set is here so
 * a disagreement at the table can be settled by reading one file.
 *
 * The rules, in the order they apply:
 *
 *   total   = die + Σ context parts (+ CRIT_BONUS on a confirmed 10)
 *   réussite when total ≥ difficulté
 *   NR      = one per full step of 5 ABOVE the difficulté — 15 succeeds at 0 NR,
 *             20 is 1 NR, 25 is 2 NR
 *
 * A 10 and a 1 each call for ONE reroll, never a cascade, and the reroll never
 * adds to the die: it only decides whether the result is confirmed. A confirmed
 * 10 is a critique worth +5, i.e. exactly one more NR. A confirmed 1 is an échec
 * critique — a FLAG, not an arithmetic penalty: the total stands as rolled and
 * what it costs is the GM's business, not the app's.
 */

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
}

/** The difficulté a test starts at when the GM hasn't said otherwise. */
export const DEFAULT_DIFFICULTY = 15;
/** How far above the difficulté one NR costs. */
export const NR_STEP = 5;
/** What a confirmed critique adds — one NR's worth. */
export const CRIT_BONUS = NR_STEP;
/** Prophecy rolls a D10 and nothing else. */
export const DIE_SIDES = 10;

export interface RollResult {
  die: number;
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
 * True while a roll is still owed its confirmation — the die asked for a reroll
 * and it hasn't been made. Here rather than in the dialog because "is this roll
 * finished" is a rule, and the UI should not be the second place that knows it.
 */
export function awaitsConfirmation(die: number | null, confirmDie: number | null): boolean {
  return die != null && confirmDie == null && needsConfirmation(die);
}

/**
 * Read a die against a context and a difficulté.
 *
 * `confirmDie` is null until the player asks for the reroll — an unconfirmed 10
 * is simply a 10, which is why this is safe to call before confirming and again
 * after. Editing the difficulté re-reads the same dice rather than rolling new
 * ones: the verdict moves, the dice don't.
 */
export function resolveRoll(
  die: number,
  ctx: RollContext,
  difficulty: number,
  confirmDie: number | null = null,
): RollResult {
  const critical = die === DIE_SIDES && confirmDie != null && confirmDie < ctx.confirm;
  const fumble = die === 1 && confirmDie != null && confirmDie > ctx.confirm;
  const bonus = critical ? CRIT_BONUS : 0;
  const total = die + contextValue(ctx) + bonus;
  const success = total >= difficulty;
  return {
    die,
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
