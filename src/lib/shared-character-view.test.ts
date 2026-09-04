import { describe, expect, it } from 'vitest';

import { effectsOf, nums, pools, skillsOf, woundOf } from './shared-character-view';

describe('reading a projection', () => {
  it('passes a present field through without copying it', () => {
    const attributs = { physique: 3 };
    expect(nums(attributs)).toBe(attributs);
    const wounds = { legere: { current: 1, max: 2 } };
    expect(pools(wounds)).toBe(wounds);
  });

  it('answers a missing field with the SAME empty every time', () => {
    // Every field is optional on the wire, and what comes back here lands in a
    // useMemo dependency list: a fresh {} or [] per call would re-group every
    // roster card's skills on every render.
    expect(nums(undefined)).toBe(nums(null));
    expect(pools(undefined)).toBe(pools(null));
    expect(effectsOf(undefined)).toBe(effectsOf('not an array'));
    expect(skillsOf(undefined)).toBe(skillsOf({}));
  });

  it('keeps arrays as they are and rejects anything else', () => {
    const effects = [{ target: 'volonte', value: 2 }];
    expect(effectsOf(effects)).toBe(effects);
    expect(effectsOf({ target: 'volonte' })).toEqual([]);
    const skills = [{ name: 'Équitation', attribut: 'physique', value: 2 }];
    expect(skillsOf(skills)).toBe(skills);
  });

  it('reads the wound malus off the boxes, worst level only', () => {
    // Not the sum: a grave wound and a light one together are -3, not -4.
    expect(woundOf({ legere: { current: 1 }, grave: { current: 1 } })).toBe(-3);
    expect(woundOf({ legere: { current: 0 } })).toBe(0);
    expect(woundOf(undefined)).toBe(0);
  });
});
