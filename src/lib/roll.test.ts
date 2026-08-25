import { describe, expect, it } from 'vitest';

import {
  CRIT_BONUS,
  DEFAULT_DIFFICULTY,
  awaitsConfirmation,
  contextValue,
  needsConfirmation,
  resolveRoll,
  type RollContext,
} from './roll';

/** Équitation: TOT 12, bought at 3 points — the number a 10 confirms against. */
const skill: RollContext = {
  label: 'Équitation',
  parts: [{ label: 'Équitation', value: 12 }],
  confirm: 3,
  confirmLabel: 'Compétence',
};

describe('contextValue', () => {
  it('sums every part, so a tuple needs no special case', () => {
    expect(contextValue(skill)).toBe(12);
    expect(
      contextValue({
        label: 'MEN + VOL + Dragon',
        parts: [
          { label: 'MEN', value: 4 },
          { label: 'VOL', value: 5 },
          { label: 'Dragon', value: 3 },
        ],
        confirm: 5,
      }),
    ).toBe(12);
  });
});

describe('needsConfirmation', () => {
  it('calls for a reroll on a 10 and on a 1, and on nothing else', () => {
    expect(needsConfirmation(10)).toBe(true);
    expect(needsConfirmation(1)).toBe(true);
    for (const die of [2, 3, 4, 5, 6, 7, 8, 9]) expect(needsConfirmation(die)).toBe(false);
  });
});

describe('awaitsConfirmation', () => {
  it('is owed while a 10 or a 1 has no reroll yet', () => {
    expect(awaitsConfirmation(10, null)).toBe(true);
    expect(awaitsConfirmation(1, null)).toBe(true);
  });

  it('is settled once the reroll is made, whatever it came up', () => {
    expect(awaitsConfirmation(10, 2)).toBe(false);
    expect(awaitsConfirmation(1, 9)).toBe(false);
  });

  it('is never owed on an ordinary die, or before one is rolled', () => {
    expect(awaitsConfirmation(7, null)).toBe(false);
    expect(awaitsConfirmation(null, null)).toBe(false);
  });
});

describe('resolveRoll', () => {
  it('counts one NR per full step of 5 above the difficulté', () => {
    // The rulebook reading: 15 succeeds, 20 is 1 NR, 25 is 2 NR.
    const at = (die: number) => resolveRoll(die, skill, DEFAULT_DIFFICULTY);
    expect(at(3)).toMatchObject({ total: 15, success: true, nr: 0 });
    expect(at(7)).toMatchObject({ total: 19, success: true, nr: 0 });
    expect(at(8)).toMatchObject({ total: 20, success: true, nr: 1 });
  });

  it('fails below the difficulté, with no negative NR', () => {
    expect(resolveRoll(2, skill, DEFAULT_DIFFICULTY)).toMatchObject({
      total: 14,
      success: false,
      nr: 0,
    });
  });

  it('leaves an unconfirmed 10 as a plain 10', () => {
    const r = resolveRoll(10, skill, DEFAULT_DIFFICULTY);
    expect(r).toMatchObject({ critical: false, bonus: 0, total: 22, nr: 1 });
  });

  it('confirms a 10 STRICTLY under the confirm value, worth one more NR', () => {
    const plain = resolveRoll(10, skill, DEFAULT_DIFFICULTY);
    const crit = resolveRoll(10, skill, DEFAULT_DIFFICULTY, 2);
    expect(crit).toMatchObject({ critical: true, bonus: CRIT_BONUS, total: 27, nr: 2 });
    expect(crit.nr).toBe(plain.nr + 1);
  });

  it('does not confirm a reroll equal to the confirm value', () => {
    expect(resolveRoll(10, skill, DEFAULT_DIFFICULTY, 3)).toMatchObject({
      critical: false,
      bonus: 0,
      total: 22,
    });
  });

  it('never adds the confirmation die to the total', () => {
    // A 10 confirmed by a 2 is 10 + 5, not 10 + 2 and not 10 + 2 + 5.
    expect(resolveRoll(10, skill, DEFAULT_DIFFICULTY, 2).total).toBe(10 + 12 + CRIT_BONUS);
  });

  it('confirms a 1 STRICTLY over the confirm value, and leaves the total alone', () => {
    const r = resolveRoll(1, skill, DEFAULT_DIFFICULTY, 8);
    expect(r).toMatchObject({ fumble: true, bonus: 0, total: 13, success: false });
  });

  it('does not confirm a 1 rerolled at or under the confirm value', () => {
    expect(resolveRoll(1, skill, DEFAULT_DIFFICULTY, 3).fumble).toBe(false);
    expect(resolveRoll(1, skill, DEFAULT_DIFFICULTY, 1).fumble).toBe(false);
  });

  it('only ever flags the die that called for the reroll', () => {
    // A 7 with a stray confirmation die is neither critique nor échec.
    expect(resolveRoll(7, skill, DEFAULT_DIFFICULTY, 1)).toMatchObject({
      critical: false,
      fumble: false,
    });
  });

  it('re-reads the same dice against a new difficulté', () => {
    const easier = resolveRoll(8, skill, 10);
    expect(easier).toMatchObject({ die: 8, total: 20, success: true, nr: 2 });
  });
});
