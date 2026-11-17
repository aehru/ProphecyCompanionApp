import { describe, expect, it } from 'vitest';

import {
  initiativeDiceCount,
  rollDice,
  rollDie,
  rollInitiative,
  rollTendances,
  trimInitiativeSlots,
  type Rng,
} from './dice';

// A deterministic RNG that replays a fixed sequence in [0,1), looping. Lets us
// pin exact faces: face = floor(r * sides) + 1.
const seq = (...rs: number[]): Rng => {
  let i = 0;
  return () => rs[i++ % rs.length];
};

describe('rollDie', () => {
  it('maps rng to [1, sides]', () => {
    expect(rollDie(10, () => 0)).toBe(1); // floor(0*10)+1
    expect(rollDie(10, () => 0.999)).toBe(10); // floor(9.99)+1
    expect(rollDie(6, () => 0.5)).toBe(4); // floor(3)+1
  });

  it('never leaves the die range across the unit interval', () => {
    const rng = seq(0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.9999);
    for (let i = 0; i < 50; i++) {
      const v = rollDie(10, rng);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('guards a degenerate d0', () => {
    expect(rollDie(0, () => 0.5)).toBe(1);
  });
});

describe('rollDice', () => {
  it('returns `count` results in roll order', () => {
    expect(rollDice(3, 6, seq(0, 0.5, 0.999))).toEqual([1, 4, 6]);
  });

  it('returns [] for a non-positive count', () => {
    expect(rollDice(0, 10)).toEqual([]);
    expect(rollDice(-2, 10)).toEqual([]);
  });
});

describe('rollInitiative — the roll itself', () => {
  it('rolls `count` D10 sorted descending', () => {
    const out = rollInitiative(4, [], [], [], seq(0.2, 0.9, 0.0, 0.5)); // faces 3, 10, 1, 6
    expect(out.values).toEqual([10, 6, 3, 1]);
  });

  it('stays within 1..10 and preserves length', () => {
    const { values } = rollInitiative(6, [], [], []);
    expect(values).toHaveLength(6);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
    // sorted descending
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });
});

describe('initiativeDiceCount', () => {
  it('adds the temporary dice to the sheet max', () => {
    expect(initiativeDiceCount(2, 0)).toBe(2);
    expect(initiativeDiceCount(2, 1)).toBe(3); // two-weapon fighting
  });

  it('subtracts a negative bonus', () => {
    expect(initiativeDiceCount(3, -1)).toBe(2);
  });

  it('floors at 0 rather than going negative', () => {
    expect(initiativeDiceCount(2, -5)).toBe(0);
  });

  it('lets a temporary die stand alone on a character with no initiative', () => {
    expect(initiativeDiceCount(0, 1)).toBe(1);
  });
});

describe('trimInitiativeSlots', () => {
  it('drops the rolls of dice that are no longer in play', () => {
    expect(trimInitiativeSlots([9, 5, 2], 2)).toEqual([9, 5]);
    expect(trimInitiativeSlots([9, 5, 2], 0)).toEqual([]);
  });

  it('trims icons the same way — one function over both slot arrays', () => {
    expect(trimInitiativeSlots(['sword', '', 'magic'], 2)).toEqual(['sword', '']);
  });

  it('leaves a shorter list alone — the grid renders a missing slot as 0', () => {
    expect(trimInitiativeSlots([9], 3)).toEqual([9]);
  });

  it('never returns the same array instance (callers persist it)', () => {
    const values = [9, 5];
    expect(trimInitiativeSlots(values, 5)).not.toBe(values);
  });
});

describe('rollInitiative', () => {
  // rng 0.65 → a 7 on a D10.
  const seven: Rng = () => 0.65;

  it('a full roll assigns marks by slot BEFORE sorting, then moves them', () => {
    // Slots roll 3, 10, 1 in order; slot 1 (icon 'sword') rolled the 10.
    const out = rollInitiative(3, [], ['', 'sword', 'magic'], [], seq(0.2, 0.9, 0.0));
    expect(out.values).toEqual([10, 3, 1]);
    expect(out.icons).toEqual(['sword', '', 'magic']);
  });

  it('rolls `count` dice regardless of how many marks are stored', () => {
    const out = rollInitiative(4, [], ['sword'], []);
    expect(out.values).toHaveLength(4);
    expect(out.icons).toHaveLength(4);
    expect(out.usage).toHaveLength(4);
  });

  it('returns nothing for a count of 0', () => {
    expect(rollInitiative(0, [], ['sword'], [])).toEqual({ values: [], icons: [], usage: [] });
  });

  it('with every slot rolled it only sorts, carrying each mark', () => {
    const out = rollInitiative(3, [3, 9, 6], ['sword', 'magic', ''], []);
    expect(out.values).toEqual([9, 6, 3]);
    expect(out.icons).toEqual(['magic', '', 'sword']);
  });

  it('keeps equal rolls in their existing order (stable sort)', () => {
    expect(rollInitiative(3, [5, 5, 5], ['a', 'b', 'c'], []).icons).toEqual(['a', 'b', 'c']);
  });

  it('rolls only a die gained mid-turn, carrying mark and use', () => {
    const r = rollInitiative(3, [9, 4], ['sword', ''], [{ use: 'atk' }, null], seven);
    expect(r.values).toEqual([9, 7, 4]);
    expect(r.icons).toEqual(['sword', '', '']);
    expect(r.usage).toEqual([{ use: 'atk' }, null, null]);
  });

  it('treats a 0 slot as not rolled yet', () => {
    expect(rollInitiative(2, [5, 0], [], [], seven).values).toEqual([7, 5]);
  });
});

describe('rollTendances', () => {
  it('rolls one D10 per tendance, in TENDANCES order', () => {
    const rolls = rollTendances(seq(0, 0.5, 0.999));
    expect(rolls).toEqual([
      { key: 'dragon', value: 1 },
      { key: 'fatalite', value: 6 },
      { key: 'homme', value: 10 },
    ]);
  });

  it('keeps every die inside a D10', () => {
    const rng = seq(0, 0.07, 0.31, 0.62, 0.88, 0.9999);
    for (let i = 0; i < 20; i++) {
      for (const { value } of rollTendances(rng)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      }
    }
  });
});
