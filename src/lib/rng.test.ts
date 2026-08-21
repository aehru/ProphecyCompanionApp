import { describe, expect, it } from 'vitest';

import { chance, hashSeed, jitter, pick, randomInt, seededRng } from '@/lib/rng';

// The point of this module is reproducibility: the generator's tests are only
// worth anything if the same seed replays the same NPC.

describe('seededRng', () => {
  it('replays identically for the same seed', () => {
    const a = seededRng('garde');
    const b = seededRng('garde');
    const draw = (r: () => number) => Array.from({ length: 10 }, r);
    expect(draw(a)).toEqual(draw(b));
  });

  it('diverges for a different seed', () => {
    const a = Array.from({ length: 5 }, seededRng('garde'));
    const b = Array.from({ length: 5 }, seededRng('garde-2'));
    expect(a).not.toEqual(b);
  });

  it('stays inside [0, 1)', () => {
    const r = seededRng('bornes');
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashSeed', () => {
  it('is stable and unsigned', () => {
    expect(hashSeed('mage')).toBe(hashSeed('mage'));
    expect(hashSeed('mage')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('mage')).not.toBe(hashSeed('Mage'));
  });
});

describe('randomInt', () => {
  it('covers both bounds and never leaves them', () => {
    const r = seededRng('int');
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(randomInt(r, 2, 5));
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it('swaps reversed bounds instead of returning nothing', () => {
    expect(randomInt(seededRng('rev'), 5, 2)).toBeGreaterThanOrEqual(2);
    expect(randomInt(() => 0.99, 5, 2)).toBe(5);
  });
});

describe('pick', () => {
  it('returns undefined on an empty list', () => {
    expect(pick(seededRng('x'), [])).toBeUndefined();
  });

  it('eventually reaches every item', () => {
    const rng = seededRng('spread');
    const items = ['a', 'b', 'c'];
    const seen = new Set(Array.from({ length: 60 }, () => pick(rng, items)));
    expect(seen.size).toBe(items.length);
  });
});

describe('chance', () => {
  it('is never true at 0 and always true at 1', () => {
    const r = seededRng('p');
    expect(chance(r, 0)).toBe(false);
    expect(chance(r, 1)).toBe(true);
  });
});

describe('jitter', () => {
  it('is zero when the spread is zero', () => {
    expect(jitter(seededRng('j'), 0)).toBe(0);
  });

  it('stays inside the spread and centers on zero', () => {
    const r = seededRng('spread');
    let sum = 0;
    for (let i = 0; i < 400; i++) {
      const j = jitter(r, 2);
      expect(Math.abs(j)).toBeLessThanOrEqual(2);
      sum += j;
    }
    expect(Math.abs(sum / 400)).toBeLessThan(0.25);
  });
});
