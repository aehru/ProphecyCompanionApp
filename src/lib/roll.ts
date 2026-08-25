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
 * the count, one die carries the roll — the one kept, or the FIRST thrown when
 * summing; the rest are neutral however they land.
 *
 * A 10 and a 1 each call for ONE reroll, never a cascade, and the reroll never
 * adds to the die: it only decides whether the result is confirmed. A confirmed
 * 10 is a critique worth +5, i.e. exactly one more NR. A confirmed 1 is an échec
 * critique — a FLAG, not an arithmetic penalty: the total stands as rolled and
 * what it costs is the GM's business, not the app's.
 *
 * **Casting is a different kind of roll** ({@link RollKind}). See
 * {@link readDice} for the whole of it; the two headlines are that magic names
 * its extremes Miracle and Contrecoup, and that it gets **no +5** — a confirmed
 * 10 while casting is a Miracle and nothing arithmetic.
 */
import type { TendanceKey } from '@/constants/prophecy';

/**
 * What several dice mean. Both exist because effects grant both: one may let you
 * throw two and keep the better, another may let you add them together.
 *
 * - `keep` — the extras are alternatives; the player picks the one that stands.
 *   The tendance trio is this mode with three coloured dice.
 * - `sum` — the dice add up into one bigger die.
 */
export type DiceMode = 'keep' | 'sum';

/**
 * Ordinary roll, or a spell being cast.
 *
 * Casting differs in three ways and nowhere else: its extremes are called
 * Miracle and Contrecoup, it gets no critique bonus, and — ONLY when cast on the
 * tendance trio — the dice left on the table can bite back. See {@link readDice}.
 */
export type RollKind = 'ordinary' | 'cast';

/** What one die turned out to mean, once its confirmation is in. */
export type DieVerdict = 'critique' | 'fumble' | 'miracle' | 'contrecoup';

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
 * is read against **the compétence, the caractéristique, or the discipline** —
 * never a total, never a sphère, never a tendance die. A skill roll confirms on
 * the points bought, not on its TOT: a 12 can't be undercut by a D10, so
 * confirming there would make every 10 a critique. On a MEN + VOL + Dragon test
 * it is VOL — the caractéristique — that the reroll answers to. The number
 * therefore does not follow from `parts` (a skill's TOT is in the sum while its
 * points are not), so the caller states it and the engine never has to guess.
 */
export interface RollContext {
  /** What is being rolled, as the player would say it: « Équitation ». */
  label: string;
  parts: RollPart[];
  /** The value the confirmation die is read against. */
  confirm: number;
  /** What that number is, for the explanation line: « Compétence ». */
  confirmLabel?: string;
  /** Ordinary unless this is a spell being cast. Default `'ordinary'`. */
  kind?: RollKind;
  /**
   * Which tendance carries the fluctuation rule when casting on the trio — the
   * Dragon, except for a spell of the Sphère de l'Ombre, where the Fatalité
   * takes its place and the Dragon becomes an ordinary die. Default `'dragon'`.
   */
  fluctuation?: TendanceKey;
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
/** What a confirmed critique adds — one NR's worth. Never granted to a cast. */
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
 * `tendances` is set only when the throw IS the trio — one tendance per die, in
 * the same order. It is what tells a cast whether the fluctuation rules apply at
 * all: they belong to the tendances, not to having several dice. Throw ORDER is
 * meaningful (index 0 carries a sum), so nothing may sort `dice`.
 */
export interface RollThrow {
  dice: number[];
  mode: DiceMode;
  /** `keep` only: which die stands. null until the player has chosen. */
  keptIndex: number | null;
  tendances?: TendanceKey[];
}

/** The one-die throw every ordinary test is. */
export function singleThrow(die: number): RollThrow {
  return { dice: [die], mode: 'keep', keptIndex: 0 };
}

/** The kept die, or null while a `keep` throw is still waiting to be picked. */
function keptDie(t: RollThrow): number | null {
  return t.keptIndex == null ? null : (t.dice[t.keptIndex] ?? null);
}

/** True for the die that carries the roll: the one kept, or the first summed. */
function isNatural(t: RollThrow, index: number): boolean {
  return t.mode === 'sum' ? index === 0 : t.keptIndex === index;
}

/**
 * The die the RULES read — the one a 10 or a 1 is about.
 *
 * In `sum` it is always the first die thrown; in `keep` it is the one kept, so
 * there is none until the player picks. Never the sum itself: a 10 means the
 * face, and 7 + 3 is not a 10.
 */
export function naturalDie(t: RollThrow): number | null {
  return t.mode === 'sum' ? (t.dice[0] ?? null) : keptDie(t);
}

/** True for the dice that are along for the ride and cannot carry the roll. */
export function isNeutralDie(t: RollThrow, index: number): boolean {
  if (t.dice.length < 2) return false;
  return !isNatural(t, index);
}

/** What the dice contribute to the total, or null while a `keep` awaits its pick. */
export function throwTotal(t: RollThrow): number | null {
  return t.mode === 'sum' ? t.dice.reduce((sum, d) => sum + d, 0) : keptDie(t);
}

/** True when the die calls for a confirmation reroll: a 10 or a 1. */
export function needsConfirmation(die: number): boolean {
  return die === DIE_SIDES || die === 1;
}

/** What one die of a throw came to mean. */
export interface DieReading {
  index: number;
  value: number;
  /** This is the die carrying the roll (kept, or first when summing). */
  natural: boolean;
  tendance?: TendanceKey;
  /** A reroll is owed on this die and hasn't been made yet. */
  awaiting: boolean;
  /** Fired with no reroll at all — the discarded fluctuation die on a 1. */
  automatic: boolean;
  /** The reroll made for THIS die, once it has been made. */
  confirmDie: number | null;
  verdict: DieVerdict | null;
}

/** A 10 is confirmed by a reroll landing STRICTLY under the confirm value. */
function confirmsHigh(reroll: number | null, confirm: number): boolean {
  return reroll != null && reroll < confirm;
}

/** A 1 is confirmed by a reroll landing STRICTLY over it. */
function confirmsLow(reroll: number | null, confirm: number): boolean {
  return reroll != null && reroll > confirm;
}

/**
 * Read every die of a throw. `confirms` holds each die's reroll, by the same
 * index — a die with none yet is `null`, or simply absent.
 *
 * **The die carrying the roll**, whatever the kind: a confirmed 10 is a critique
 * (a *Miracle* while casting), a confirmed 1 an échec critique (a *Contrecoup*).
 *
 * **The dice left on the table matter ONLY when casting on the tendance trio.**
 * The tendances ARE the fluctuation of magic, and failing to channel a very good
 * or very bad one has consequences; a spell rolled on plain dice — one or five,
 * kept or summed — never invokes that power, so its discarded dice stay inert
 * like any other roll's. On the trio, a discarded 10 or 1 rerolls and a
 * confirmation means **Contrecoup** — the 10 included, since the backlash is for
 * ignoring the fluctuation, not for rolling badly. One case skips the reroll
 * entirely: the **fluctuation die showing 1 while discarded** is a Contrecoup
 * outright.
 *
 * Nothing resolves while a `keep` throw has no pick: until the player chooses,
 * no die is discarded and the question of what was ignored has no answer.
 */
export function readDice(
  t: RollThrow,
  ctx: RollContext,
  confirms: readonly (number | null)[] = [],
): DieReading[] {
  const cast = ctx.kind === 'cast';
  const fluctuation = ctx.fluctuation ?? 'dragon';
  const trio = t.tendances != null && t.tendances.length === t.dice.length;
  const pending = t.mode === 'keep' && t.keptIndex == null;

  return t.dice.map((value, index) => {
    const tendance = t.tendances?.[index];
    const base: DieReading = {
      index,
      value,
      natural: isNatural(t, index),
      tendance,
      awaiting: false,
      automatic: false,
      confirmDie: confirms[index] ?? null,
      verdict: null,
    };
    if (pending) return base;
    // A discarded die is inert unless this is a cast on the trio — the whole of
    // the "ignoring a fluctuation costs you" rule lives behind this one guard.
    if (!base.natural && (!cast || !trio)) return base;
    // …and the one case that never gets to reroll.
    if (!base.natural && value === 1 && tendance === fluctuation) {
      return { ...base, automatic: true, verdict: 'contrecoup' };
    }

    // Every remaining die takes the SAME test — a 10 rerolls under the confirm
    // value, a 1 rerolls over it — and differs only in what a confirmation is
    // called. Discarding is always a Contrecoup, whichever face caused it.
    const [high, low]: [DieVerdict, DieVerdict] = !base.natural
      ? ['contrecoup', 'contrecoup']
      : cast
        ? ['miracle', 'contrecoup']
        : ['critique', 'fumble'];

    const reroll = base.confirmDie;
    if (value === DIE_SIDES) {
      return {
        ...base,
        awaiting: reroll == null,
        verdict: confirmsHigh(reroll, ctx.confirm) ? high : null,
      };
    }
    if (value === 1) {
      return {
        ...base,
        awaiting: reroll == null,
        verdict: confirmsLow(reroll, ctx.confirm) ? low : null,
      };
    }
    return base;
  });
}

/**
 * True while any die of the throw is still owed its confirmation. Here rather
 * than in the dialog because "is this roll finished" is a rule, and the UI
 * should not be the second place that knows it.
 */
export function awaitsConfirmation(
  t: RollThrow | null,
  ctx: RollContext,
  confirms: readonly (number | null)[] = [],
): boolean {
  return t != null && readDice(t, ctx, confirms).some((r) => r.awaiting);
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
  /** Every die's reading, the discarded ones a cast can act on included. */
  readings: DieReading[];
  /** What the throw produced, deduplicated, in die order. Often empty. */
  verdicts: DieVerdict[];
  /** The roll-carrying die confirmed a 10. Never on a cast — that is a Miracle. */
  critical: boolean;
  /** The roll-carrying die confirmed a 1. Never on a cast — that is a Contrecoup. */
  fumble: boolean;
  /** CRIT_BONUS on a confirmed critique, else 0. A cast never earns it. */
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

/**
 * Read a throw against a context and a difficulté.
 *
 * Returns null while the throw isn't settled — a `keep` whose die hasn't been
 * picked has no result yet, and saying so here keeps the UI from having to know
 * why. Otherwise safe to call at any point: a die with no reroll yet is simply
 * unconfirmed, and editing the difficulté re-reads the same dice rather than
 * rolling new ones — the verdict moves, the dice don't.
 */
export function resolveRoll(
  t: RollThrow,
  ctx: RollContext,
  difficulty: number,
  confirms: readonly (number | null)[] = [],
): RollResult | null {
  const diceTotal = throwTotal(t);
  const natural = naturalDie(t);
  if (diceTotal == null || natural == null) return null;

  const readings = readDice(t, ctx, confirms);
  const verdicts = [...new Set(readings.map((r) => r.verdict).filter((v) => v != null))];
  const critical = verdicts.includes('critique');
  const fumble = verdicts.includes('fumble');
  // Magic buys no bonus: a Miracle is a name, not five points.
  const bonus = critical ? CRIT_BONUS : 0;
  const total = diceTotal + contextValue(ctx) + bonus;
  const success = total >= difficulty;
  return {
    dice: t.dice,
    mode: t.mode,
    keptIndex: t.keptIndex,
    natural,
    diceTotal,
    readings,
    verdicts,
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
