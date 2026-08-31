import { describe, expect, it } from 'vitest';

import { enchantScoreReading } from '@/lib/enchant-score';

describe('enchantScoreReading', () => {
  it('returns null unless BOTH numbers are recorded', () => {
    expect(enchantScoreReading(null, null)).toBeNull();
    expect(enchantScoreReading(20, null)).toBeNull();
    expect(enchantScoreReading(null, 15)).toBeNull();
    expect(enchantScoreReading(undefined, undefined)).toBeNull();
  });

  it('counts one NR per full step of 5 above the difficulté', () => {
    expect(enchantScoreReading(15, 15)).toMatchObject({ success: true, nr: 0 });
    expect(enchantScoreReading(19, 15)).toMatchObject({ success: true, nr: 0 });
    expect(enchantScoreReading(20, 15)).toMatchObject({ success: true, nr: 1 });
    expect(enchantScoreReading(24, 15)).toMatchObject({ success: true, nr: 1 });
    expect(enchantScoreReading(25, 15)).toMatchObject({ success: true, nr: 2 });
  });

  it('stores a failed enchantment rather than refusing it', () => {
    expect(enchantScoreReading(9, 15)).toEqual({ score: 9, difficulty: 15, success: false, nr: 0 });
  });

  // 0 is a value, not an absence — on either side of the pair. A truthiness
  // check anywhere in here would read a score of 0 as "nothing recorded" and a
  // difficulté of 0 as the same, which is how a botched enchantment would
  // silently become an unrecorded one.
  it('reads a recorded 0 as a number, not as a missing entry', () => {
    expect(enchantScoreReading(0, 30)).toEqual({ score: 0, difficulty: 30, success: false, nr: 0 });
    expect(enchantScoreReading(0, 0)).toEqual({ score: 0, difficulty: 0, success: true, nr: 0 });
  });
});
