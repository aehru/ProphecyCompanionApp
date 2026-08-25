import { describe, expect, it } from 'vitest';

import {
  CRIT_BONUS,
  DEFAULT_DIFFICULTY,
  awaitsConfirmation,
  contextValue,
  diceCount,
  isNeutralDie,
  MAX_DICE,
  naturalDie,
  needsConfirmation,
  resolveRoll,
  singleThrow,
  throwTotal,
  type RollContext,
  type RollThrow,
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
    expect(awaitsConfirmation(singleThrow(10), null)).toBe(true);
    expect(awaitsConfirmation(singleThrow(1), null)).toBe(true);
  });

  it('is settled once the reroll is made, whatever it came up', () => {
    expect(awaitsConfirmation(singleThrow(10), 2)).toBe(false);
    expect(awaitsConfirmation(singleThrow(1), 9)).toBe(false);
  });

  it('is never owed on an ordinary die, or before anything is rolled', () => {
    expect(awaitsConfirmation(singleThrow(7), null)).toBe(false);
    expect(awaitsConfirmation(null, null)).toBe(false);
  });

  it('waits for the pick before asking to confirm a kept 10', () => {
    const t: RollThrow = { dice: [10, 4], mode: 'keep', keptIndex: null };
    expect(awaitsConfirmation(t, null)).toBe(false);
    expect(awaitsConfirmation({ ...t, keptIndex: 0 }, null)).toBe(true);
    // Keeping the OTHER die drops the question entirely.
    expect(awaitsConfirmation({ ...t, keptIndex: 1 }, null)).toBe(false);
  });
});

/** resolveRoll returns null only for an unsettled throw; these all settle. */
const read = (t: RollThrow, difficulty = DEFAULT_DIFFICULTY, confirmDie: number | null = null) =>
  resolveRoll(t, skill, difficulty, confirmDie)!;

describe('resolveRoll', () => {
  it('counts one NR per full step of 5 above the difficulté', () => {
    // The rulebook reading: 15 succeeds, 20 is 1 NR, 25 is 2 NR.
    const at = (die: number) => read(singleThrow(die));
    expect(at(3)).toMatchObject({ total: 15, success: true, nr: 0 });
    expect(at(7)).toMatchObject({ total: 19, success: true, nr: 0 });
    expect(at(8)).toMatchObject({ total: 20, success: true, nr: 1 });
  });

  it('fails below the difficulté, with no negative NR', () => {
    expect(read(singleThrow(2))).toMatchObject({ total: 14, success: false, nr: 0 });
  });

  it('leaves an unconfirmed 10 as a plain 10', () => {
    expect(read(singleThrow(10))).toMatchObject({ critical: false, bonus: 0, total: 22, nr: 1 });
  });

  it('confirms a 10 STRICTLY under the confirm value, worth one more NR', () => {
    const plain = read(singleThrow(10));
    const crit = read(singleThrow(10), DEFAULT_DIFFICULTY, 2);
    expect(crit).toMatchObject({ critical: true, bonus: CRIT_BONUS, total: 27, nr: 2 });
    expect(crit.nr).toBe(plain.nr + 1);
  });

  it('does not confirm a reroll equal to the confirm value', () => {
    expect(read(singleThrow(10), DEFAULT_DIFFICULTY, 3)).toMatchObject({
      critical: false,
      bonus: 0,
      total: 22,
    });
  });

  it('never adds the confirmation die to the total', () => {
    // A 10 confirmed by a 2 is 10 + 5, not 10 + 2 and not 10 + 2 + 5.
    expect(read(singleThrow(10), DEFAULT_DIFFICULTY, 2).total).toBe(10 + 12 + CRIT_BONUS);
  });

  it('confirms a 1 STRICTLY over the confirm value, and leaves the total alone', () => {
    expect(read(singleThrow(1), DEFAULT_DIFFICULTY, 8)).toMatchObject({
      fumble: true,
      bonus: 0,
      total: 13,
      success: false,
    });
  });

  it('does not confirm a 1 rerolled at or under the confirm value', () => {
    expect(read(singleThrow(1), DEFAULT_DIFFICULTY, 3).fumble).toBe(false);
    expect(read(singleThrow(1), DEFAULT_DIFFICULTY, 1).fumble).toBe(false);
  });

  it('only ever flags the die that called for the reroll', () => {
    // A 7 with a stray confirmation die is neither critique nor échec.
    expect(read(singleThrow(7), DEFAULT_DIFFICULTY, 1)).toMatchObject({
      critical: false,
      fumble: false,
    });
  });

  it('re-reads the same dice against a new difficulté', () => {
    expect(read(singleThrow(8), 10)).toMatchObject({ natural: 8, total: 20, success: true, nr: 2 });
  });

  it('has no result at all while a keep throw awaits its pick', () => {
    expect(resolveRoll({ dice: [8, 2], mode: 'keep', keptIndex: null }, skill, 15)).toBeNull();
  });
});

describe('several dice at once', () => {
  it('sums every die in sum mode', () => {
    const r = read({ dice: [4, 6, 3], mode: 'sum', keptIndex: null });
    expect(r).toMatchObject({ diceTotal: 13, total: 25, nr: 2 });
  });

  it('counts only the kept die in keep mode', () => {
    const t: RollThrow = { dice: [4, 6, 3], mode: 'keep', keptIndex: 1 };
    expect(read(t)).toMatchObject({ diceTotal: 6, total: 18 });
  });

  it('reads crit and fumble off the FIRST die only, when summing', () => {
    // A 10 anywhere but first is along for the ride, whatever it adds.
    const first = read({ dice: [10, 2], mode: 'sum', keptIndex: null }, DEFAULT_DIFFICULTY, 1);
    expect(first).toMatchObject({ natural: 10, critical: true, diceTotal: 12 });

    const later = read({ dice: [2, 10], mode: 'sum', keptIndex: null }, DEFAULT_DIFFICULTY, 1);
    expect(later).toMatchObject({ natural: 2, critical: false, diceTotal: 12 });
  });

  it('never reads a 10 out of a sum that merely reaches 10', () => {
    // 7 + 3 is a total of ten and not a FACE of ten: nothing to confirm.
    const r = read({ dice: [7, 3], mode: 'sum', keptIndex: null }, DEFAULT_DIFFICULTY, 1);
    expect(r).toMatchObject({ natural: 7, critical: false, fumble: false });
  });

  it('reads a fumble off the first die only', () => {
    expect(read({ dice: [1, 9], mode: 'sum', keptIndex: null }, DEFAULT_DIFFICULTY, 8).fumble).toBe(
      true,
    );
    expect(read({ dice: [9, 1], mode: 'sum', keptIndex: null }, DEFAULT_DIFFICULTY, 8).fumble).toBe(
      false,
    );
  });

  it('reads crit off whichever die was KEPT, not the first thrown', () => {
    const t: RollThrow = { dice: [4, 10], mode: 'keep', keptIndex: 1 };
    expect(read(t, DEFAULT_DIFFICULTY, 2)).toMatchObject({ natural: 10, critical: true });
  });
});

describe('naturalDie / throwTotal / isNeutralDie', () => {
  it('marks every die but the first as neutral when summing', () => {
    const t: RollThrow = { dice: [5, 5, 5], mode: 'sum', keptIndex: null };
    expect(naturalDie(t)).toBe(5);
    expect(throwTotal(t)).toBe(15);
    expect([0, 1, 2].map((i) => isNeutralDie(t, i))).toEqual([false, true, true]);
  });

  it('marks every die but the kept one as neutral when keeping', () => {
    const t: RollThrow = { dice: [5, 9, 2], mode: 'keep', keptIndex: 1 };
    expect(naturalDie(t)).toBe(9);
    expect(throwTotal(t)).toBe(9);
    expect([0, 1, 2].map((i) => isNeutralDie(t, i))).toEqual([true, false, true]);
  });

  it('calls a lone die neutral in neither mode — there is nothing to compare it to', () => {
    expect(isNeutralDie(singleThrow(7), 0)).toBe(false);
    expect(isNeutralDie({ dice: [7], mode: 'sum', keptIndex: null }, 0)).toBe(false);
  });

  it('has no natural and no total while a keep throw awaits its pick', () => {
    const t: RollThrow = { dice: [8, 2], mode: 'keep', keptIndex: null };
    expect(naturalDie(t)).toBeNull();
    expect(throwTotal(t)).toBeNull();
  });
});

describe('diceCount', () => {
  it('floors at one die and caps at MAX_DICE', () => {
    expect(diceCount(0)).toBe(1);
    expect(diceCount(-3)).toBe(1);
    expect(diceCount(2)).toBe(2);
    expect(diceCount(99)).toBe(MAX_DICE);
  });

  it('falls back to one die on a field that holds no number yet', () => {
    expect(diceCount(NaN)).toBe(1);
  });
});
