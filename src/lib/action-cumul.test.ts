import { describe, expect, it } from 'vitest';

import {
  actionCounts,
  cumulMalus,
  isDodgeSkill,
  markDie,
  withActionCumul,
  type DieUsage,
} from '@/lib/action-cumul';

const atk = (at: number): DieUsage => ({ use: 'atk', at });
const def = (at: number): DieUsage => ({ use: 'def', at });
const other = (at: number): DieUsage => ({ use: 'other', at });

describe('cumul des actions', () => {
  it('first attack and first défense are free, then +5 each', () => {
    expect(cumulMalus([], 'atk')).toBe(0);
    expect(cumulMalus([atk(9)], 'atk')).toBe(5);
    expect(cumulMalus([atk(9), atk(6)], 'atk')).toBe(10);
  });

  it('keeps attacks and défenses on separate counters, and ignores Autre', () => {
    const usage = [atk(9), def(4), other(2), null];
    expect(actionCounts(usage)).toEqual({ atk: 1, def: 1 });
    expect(cumulMalus(usage, 'def')).toBe(5);
    expect(cumulMalus(usage, 'atk')).toBe(5);
  });

  it('tolerates a missing array', () => {
    expect(cumulMalus(undefined, 'atk')).toBe(0);
  });
});

describe('markDie', () => {
  it('sets one slot and pads to the dice count', () => {
    expect(markDie([], 3, 1, 'atk', 7)).toEqual([null, atk(7), null]);
  });

  it('null frees the die', () => {
    expect(markDie([atk(9), def(4)], 2, 0, null, 0)).toEqual([null, def(4)]);
  });

  it('drops slots beyond the count', () => {
    expect(markDie([atk(9), def(4), other(1)], 2, 0, 'atk', 9)).toEqual([atk(9), def(4)]);
  });
});

describe('isDodgeSkill', () => {
  it('reads Esquive and its spécialisations, nothing else', () => {
    expect(isDodgeSkill('Esquive')).toBe(true);
    expect(isDodgeSkill('Esquive (Acrobatique)')).toBe(true);
    expect(isDodgeSkill('Corps à corps')).toBe(false);
  });
});

describe('withActionCumul', () => {
  const ctx = { label: 'Épée', parts: [{ label: 'Épée', value: 10 }], confirm: 4 };

  it('raises the Difficulté from the default', () => {
    expect(withActionCumul(ctx, [atk(9)], 'atk')).toMatchObject({
      difficulty: 20,
      label: 'Épée (cumul +5)',
    });
  });

  it('leaves a free action alone', () => {
    expect(withActionCumul(ctx, [atk(9)], 'def')).toBe(ctx);
  });
});
