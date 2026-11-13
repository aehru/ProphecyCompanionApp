/**
 * What each initiative die was SPENT on this turn, and the rulebook's « cumul
 * des actions » that follows from it.
 *
 * Per turn a character gets ONE attack and ONE défense (parade or esquive) at
 * no cost; every further attack, and every further défense, raises its
 * Difficulté by 5 more than the last (+5, +10, …). The two counters are
 * separate: an attack does not make the next défense harder. « Autre » covers
 * everything else (a free action, a move, a spell) and never counts.
 *
 * A défense spends a die like any action — the defender picks one of their
 * still-unused dice, normally a lower one, and that die is gone for the turn.
 *
 * Stored as `actual_state.initiative_usage`, index-aligned with
 * `initiativeValues`, `null` for a die not used yet. `at` is the die's
 * effective value (wound malus included) at the moment it was spent, so a wound
 * taken AFTER acting can't drag an already-played die back down the GM's order.
 *
 * Pure and DB/React-free so the rule stays testable.
 */
import { z } from 'zod';

import { DEFAULT_DIFFICULTY, NR_STEP, type RollContext } from '@/lib/roll';

export const DIE_USES = ['atk', 'def', 'other'] as const;
export type DieUse = (typeof DIE_USES)[number];

/**
 * The stored/wired shape, ONE definition for the campaign projection and the
 * export envelope alike; the type is read off it so the two can't drift.
 */
export const dieUsageListSchema = z.array(
  z.object({ use: z.enum(DIE_USES), at: z.number().int() }).nullable(),
);
export type DieUsage = z.infer<typeof dieUsageListSchema>[number];

export const DIE_USE_LABEL: Record<DieUse, string> = {
  atk: 'Attaque',
  def: 'Défense',
  other: 'Autre',
};

/** For a die chip, where the full word doesn't fit. */
export const DIE_USE_SHORT: Record<DieUse, string> = {
  atk: 'Att.',
  def: 'Déf.',
  other: 'Autre',
};

/** Each action past the first of its kind costs this much more Difficulté. */
export const CUMUL_STEP = NR_STEP;

/** How many dice went to attacks and to défenses this turn. */
export function actionCounts(usage: readonly DieUsage[] | null | undefined): {
  atk: number;
  def: number;
} {
  let atk = 0;
  let def = 0;
  for (const u of usage ?? []) {
    if (u?.use === 'atk') atk++;
    else if (u?.use === 'def') def++;
  }
  return { atk, def };
}

/**
 * The Difficulté surcharge on the NEXT action of that kind: the first is free,
 * so it is simply the step times how many came before.
 */
export function cumulMalus(
  usage: readonly DieUsage[] | null | undefined,
  use: 'atk' | 'def',
): number {
  return CUMUL_STEP * actionCounts(usage)[use];
}

/**
 * A die the wound malus has driven to 0 or below before it was played: its
 * action is lost. A SPENT die never is — it was played before the wound.
 */
export function isLostDie(raw: number, malus: number, spent: DieUsage | undefined): boolean {
  return !spent && raw + malus <= 0;
}

/**
 * Write one die's use into the array, sized to the dice in play. `use: null`
 * frees the die again (the plain undo).
 */
export function markDie(
  usage: readonly DieUsage[] | null | undefined,
  count: number,
  index: number,
  use: DieUse | null,
  at: number,
): DieUsage[] {
  return Array.from({ length: Math.max(0, count) }, (_, j) =>
    j === index ? (use ? { use, at } : null) : (usage?.[j] ?? null),
  );
}

/**
 * The one compétence the roller can read as a défense on its own. A parade is a
 * weapon roll and reads as an attack — the player raises that one by hand.
 */
export function isDodgeSkill(name: string): boolean {
  return name.split(' (')[0].trim() === 'Esquive';
}

/**
 * Raise a roll's Difficulté by the cumul of `use` this turn — the roller opens
 * on the right number and the title says why. A free action returns the
 * context untouched.
 */
export function withActionCumul(
  ctx: RollContext,
  usage: readonly DieUsage[] | null | undefined,
  use: 'atk' | 'def',
): RollContext {
  const surcharge = cumulMalus(usage, use);
  if (surcharge <= 0) return ctx;
  return {
    ...ctx,
    label: `${ctx.label} (cumul +${surcharge})`,
    difficulty: (ctx.difficulty ?? DEFAULT_DIFFICULTY) + surcharge,
  };
}
