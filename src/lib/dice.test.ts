import { describe, expect, it } from 'vitest';

import {
  initiativeDiceCount,
  rollDice,
  rollDie,
  rollInitiativeWithIcons,
  sortInitiativeSlots,
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

describe('rollInitiativeWithIcons — the roll itself', () => {
  it('rolls `count` D10 sorted descending', () => {
    const out = rollInitiativeWithIcons(4, [], seq(0.2, 0.9, 0.0, 0.5)); // faces 3, 10, 1, 6
    expect(out.values).toEqual([10, 6, 3, 1]);
  });

  it('stays within 1..10 and preserves length', () => {
    const { values } = rollInitiativeWithIcons(6, []);
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

describe('sortInitiativeSlots', () => {
  it('sorts highest-first, carrying each icon with its own value', () => {
    const out = sortInitiativeSlots([3, 9, 6], ['sword', 'magic', '']);
    expect(out.values).toEqual([9, 6, 3]);
    expect(out.icons).toEqual(['magic', '', 'sword']);
  });

  it('fills a missing icon with the empty mark', () => {
    expect(sortInitiativeSlots([4, 7], ['sword']).icons).toEqual(['', 'sword']);
  });

  it('keeps equal rolls in their existing order (stable sort)', () => {
    const out = sortInitiativeSlots([5, 5, 5], ['a', 'b', 'c']);
    expect(out.icons).toEqual(['a', 'b', 'c']);
  });

  it('returns aligned arrays of the same length', () => {
    const out = sortInitiativeSlots([2, 8, 1], []);
    expect(out.icons).toHaveLength(out.values.length);
  });
});

describe('rollInitiativeWithIcons', () => {
  it('assigns icons by slot BEFORE sorting, then moves the pairs', () => {
    // Slots roll 3, 10, 1 in order; slot 1 (icon 'sword') rolled the 10.
    const out = rollInitiativeWithIcons(3, ['', 'sword', 'magic'], seq(0.2, 0.9, 0.0));
    expect(out.values).toEqual([10, 3, 1]);
    expect(out.icons).toEqual(['sword', '', 'magic']);
  });

  it('rolls `count` dice regardless of how many icons are stored', () => {
    const out = rollInitiativeWithIcons(4, ['sword']);
    expect(out.values).toHaveLength(4);
    expect(out.icons).toHaveLength(4);
  });

  it('returns nothing for a count of 0', () => {
    expect(rollInitiativeWithIcons(0, ['sword'])).toEqual({ values: [], icons: [] });
  });
});
