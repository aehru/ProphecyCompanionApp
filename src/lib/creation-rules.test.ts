import { describe, expect, it } from 'vitest';

import {
  AGE_BANDS,
  NATIONS,
  parseTendanceStart,
  tendanceStart,
  ageFromD10,
  ageMod,
  attributModifier,
  attributPool,
  initiativeDice,
  resourceStart,
  woundBoxes,
} from '@/lib/creation-rules';

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

describe('age', () => {
  it('maps the D10 to the rulebook bands', () => {
    expect([1, 2, 3, 4, 7, 8, 9, 10].map(ageFromD10)).toEqual([
      'enfant',
      'adolescent',
      'adolescent',
      'adulte',
      'adulte',
      'ancien',
      'ancien',
      'venerable',
    ]);
  });
  it('reads the modificateurs, 0 when none', () => {
    expect(ageMod('enfant', 'empathie')).toBe(2);
    expect(ageMod('adolescent', 'perception')).toBe(1);
    expect(ageMod('venerable', 'coordination')).toBe(-1);
    expect(ageMod('adulte', 'force')).toBe(0);
    expect(ageMod(null, 'force')).toBe(0);
  });
  it('reads the attribut pool off the age, Adulte by default', () => {
    expect(attributPool('enfant')).toEqual([4, 4, 4, 3]);
    expect(attributPool('venerable')).toEqual([6, 6, 4, 3]);
    expect(attributPool(null)).toEqual([5, 5, 4, 3]);
  });
  it('reads MAÎTRISE ET CHANCE off the age, Adulte by default', () => {
    expect(resourceStart('adolescent')).toEqual({ fixed: { chance: 2 }, free: 4 });
    expect(resourceStart('venerable')).toEqual({ fixed: { maitrise: 4 }, free: 3 });
    expect(resourceStart(null)).toEqual({ fixed: {}, free: 6 });
  });
});

describe('tendances de départ', () => {
  it('parses a cell as the book prints it', () => {
    expect(parseTendanceStart('2TD, 1TF, 2L')).toEqual({
      fixed: { dragon: 2, fatalite: 1, homme: 0 },
      free: 2,
    });
    expect(parseTendanceStart('5TD').free).toBe(0);
  });
  it('totals 2 / 3 / 4 / 5 / 5 points per age for every nation (proofreads the table)', () => {
    for (const nation of NATIONS) {
      const totals = AGE_BANDS.map((b) => {
        const s = tendanceStart(nation.key, b.key);
        return s.free + s.fixed.dragon + s.fixed.fatalite + s.fixed.homme;
      });
      expect([nation.key, totals]).toEqual([nation.key, [2, 3, 4, 5, 5]]);
    }
  });
  it('reads the Adulte column while no age is chosen', () => {
    expect(tendanceStart('kar', null)).toEqual(tendanceStart('kar', 'adulte'));
  });
});

describe('attributModifier', () => {
  it('maps every band of the table, NA at 0', () => {
    const sums = [0, 1, 2, 3, 5, 6, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];
    expect(sums.map(attributModifier)).toEqual([
      null, -3, -3, -2, -2, -1, -1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
  });
});
