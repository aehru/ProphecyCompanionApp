import { describe, expect, it } from 'vitest';

import { initiativeDice, totalWoundBoxes, woundBoxes } from '@/lib/creation-rules';

// The rulebook gives the wound track as a band table on RÉS + VOL. These cases
// walk every band boundary, since an off-by-one there is invisible on a sheet
// but wrong at the table.

describe('woundBoxes', () => {
  it('gives the weakest track below 5', () => {
    expect(woundBoxes(0, 0)).toEqual({
      egratignureMax: 2, legereMax: 1, graveMax: 1, fataleMax: 1, mortMax: 1,
    });
    expect(woundBoxes(2, 2)).toEqual(woundBoxes(0, 4));
  });

  it('steps at each band boundary', () => {
    expect(woundBoxes(3, 2).legereMax).toBe(2); // 5 → second band
    expect(woundBoxes(5, 5).graveMax).toBe(2); // 10 → third
    expect(woundBoxes(8, 7)).toEqual({
      egratignureMax: 3, legereMax: 3, graveMax: 2, fataleMax: 2, mortMax: 1,
    });
    expect(woundBoxes(10, 10)).toEqual({
      egratignureMax: 3, legereMax: 4, graveMax: 3, fataleMax: 2, mortMax: 1,
    });
  });

  it('stays inside a band', () => {
    expect(woundBoxes(4, 5)).toEqual(woundBoxes(6, 3)); // both 9
  });

  it('clamps above the table instead of inventing a band', () => {
    expect(woundBoxes(20, 20)).toEqual(woundBoxes(12, 12));
  });

  it('treats a missing or negative score as the weakest band', () => {
    expect(woundBoxes(-3, 0).egratignureMax).toBe(2);
    expect(woundBoxes(undefined as unknown as number, 0).egratignureMax).toBe(2);
  });

  it('returns a fresh object each call', () => {
    const a = woundBoxes(5, 5);
    a.mortMax = 99;
    expect(woundBoxes(5, 5).mortMax).toBe(1);
  });
});

describe('initiativeDice', () => {
  it('steps at each band boundary', () => {
    expect(initiativeDice(1, 1)).toBe(1); // 2
    expect(initiativeDice(3, 2)).toBe(1); // 5
    expect(initiativeDice(3, 3)).toBe(2); // 6
    expect(initiativeDice(5, 4)).toBe(2); // 9
    expect(initiativeDice(5, 5)).toBe(3); // 10
    expect(initiativeDice(7, 6)).toBe(3); // 13
    expect(initiativeDice(7, 7)).toBe(4); // 14
    expect(initiativeDice(8, 8)).toBe(4); // 16
    expect(initiativeDice(9, 8)).toBe(5); // 17
  });

  it('never leaves a character without an action', () => {
    expect(initiativeDice(0, 0)).toBe(1);
    expect(initiativeDice(-4, 1)).toBe(1);
  });

  it('clamps above the table instead of inventing a sixth die', () => {
    expect(initiativeDice(10, 10)).toBe(5);
  });
});

describe('totalWoundBoxes', () => {
  it('sums every level', () => {
    expect(totalWoundBoxes(woundBoxes(0, 0))).toBe(6);
    expect(totalWoundBoxes(woundBoxes(10, 10))).toBe(13);
  });
});
