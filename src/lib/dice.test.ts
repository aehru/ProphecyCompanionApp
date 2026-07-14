import { describe, expect, it } from 'vitest';

import { rollDice, rollDie, rollInitiative, type Rng } from './dice';

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

describe('rollInitiative', () => {
  it('rolls `count` D10 sorted descending', () => {
    const out = rollInitiative(4, seq(0.2, 0.9, 0.0, 0.5)); // faces 3, 10, 1, 6
    expect(out).toEqual([10, 6, 3, 1]);
  });

  it('stays within 1..10 and preserves length', () => {
    const out = rollInitiative(6);
    expect(out).toHaveLength(6);
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
    // sorted descending
    expect([...out].sort((a, b) => b - a)).toEqual(out);
  });
});
