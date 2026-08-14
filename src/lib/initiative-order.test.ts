import { describe, expect, it } from 'vitest';

import { initiativeOrder, sharedWoundMalus, type InitiativeInput } from './initiative-order';

/** Minimal roster entry; `grave` is the -3 wound level. */
const entry = (
  nom: string,
  values: number[],
  wounds?: InitiativeInput['wounds'],
): InitiativeInput => ({
  charId: nom.toLowerCase(),
  nom,
  online: true,
  wounds,
  initiative: { max: values.length, values },
});

describe('sharedWoundMalus', () => {
  it('is 0 with no wounds', () => {
    expect(sharedWoundMalus({})).toBe(0);
    expect(sharedWoundMalus(null)).toBe(0);
  });

  it('reads the projection pool shape', () => {
    expect(sharedWoundMalus({ grave: { current: 1, max: 3 } })).toBe(-3);
  });

  it('takes the single worst level, not the sum', () => {
    expect(sharedWoundMalus({ legere: { current: 2 }, grave: { current: 1 } })).toBe(-3);
  });

  it('ignores a level with no filled boxes', () => {
    expect(sharedWoundMalus({ grave: { current: 0 }, legere: { current: 1 } })).toBe(-1);
  });
});

describe('initiativeOrder', () => {
  it('emits one row per die, so a character can appear three times', () => {
    const { rows } = initiativeOrder([entry('Garde', [8, 5, 2])]);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.dieIndex)).toEqual([0, 1, 2]);
  });

  it('tags every row with the character total, so a row reads "Dé 2/3"', () => {
    const { rows } = initiativeOrder([entry('Garde', [8, 5, 2]), entry('Arden', [9])]);
    const garde = rows.filter((r) => r.nom === 'Garde');
    expect(garde.map((r) => [r.dieIndex, r.dieCount])).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
    ]);
    // The total is per character, not the length of the whole ranking.
    expect(rows.find((r) => r.nom === 'Arden')?.dieCount).toBe(1);
  });

  it('counts unusable dice in the total — they are flagged, not dropped', () => {
    // A wound malus deep enough to kill the low die: it still counts as one of
    // the character's dice, and its own row says it buys no action.
    const { rows } = initiativeOrder([entry('Blessé', [9, 1], { grave: { current: 1, max: 3 } })]);
    expect(rows.every((r) => r.dieCount === 2)).toBe(true);
  });

  it('ranks every die across characters, highest first', () => {
    const { rows } = initiativeOrder([entry('Garde', [4, 9]), entry('Arden', [7, 2])]);
    expect(rows.map((r) => [r.nom, r.raw])).toEqual([
      ['Garde', 9],
      ['Arden', 7],
      ['Garde', 4],
      ['Arden', 2],
    ]);
  });

  it('ranks on the wounded value, not the number rolled', () => {
    const { rows } = initiativeOrder([
      entry('Blesse', [9], { grave: { current: 1 } }), // 9 - 3 = 6
      entry('Indemne', [7]),
    ]);
    expect(rows.map((r) => r.nom)).toEqual(['Indemne', 'Blesse']);
    expect(rows[1]).toMatchObject({ raw: 9, malus: -3, effective: 6 });
  });

  it('sinks unusable dice below every usable one', () => {
    const { rows } = initiativeOrder([
      entry('Blesse', [2, 8], { fatale: { current: 1 } }), // -5 → -3 and 3
      entry('Arden', [1]),
    ]);
    expect(rows.map((r) => [r.nom, r.effective])).toEqual([
      ['Blesse', 3],
      ['Arden', 1],
      ['Blesse', -3],
    ]);
    expect(rows[2].unusable).toBe(true);
  });

  it('breaks ties by name then die index for a stable order', () => {
    const { rows } = initiativeOrder([entry('Zoe', [5]), entry('Arden', [5, 5])]);
    expect(rows.map((r) => [r.nom, r.dieIndex])).toEqual([
      ['Arden', 0],
      ['Arden', 1],
      ['Zoe', 0],
    ]);
  });

  it('separates characters who have not rolled', () => {
    const { rows, unrolled } = initiativeOrder([entry('Arden', []), entry('Garde', [6])]);
    expect(rows.map((r) => r.nom)).toEqual(['Garde']);
    expect(unrolled.map((e) => e.nom)).toEqual(['Arden']);
  });

  it('handles an empty roster', () => {
    expect(initiativeOrder([])).toEqual({ rows: [], unrolled: [] });
  });
});
