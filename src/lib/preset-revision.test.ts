import { describe, expect, it } from 'vitest';

import { presetRevision } from './preset-revision';

const base = {
  name: 'Cache-cache',
  level: 1,
  complexity: 2,
  discipline: 'sorcellerie',
  sphere: 'sphereAir',
  cost: 3,
  castTimeAmount: 1,
  castTimeUnit: 'action',
  difficulty: 12,
  cle: '',
  effect: 'Le mage se dissimule.',
};

describe('presetRevision', () => {
  it('is stable across runs', () => {
    expect(presetRevision(base)).toBe(presetRevision({ ...base }));
  });

  it('ignores key order — the generator may reorder its object literal', () => {
    const shuffled = Object.fromEntries(Object.entries(base).reverse());
    expect(presetRevision(shuffled)).toBe(presetRevision(base));
  });

  it('ignores tag order: tags are a set, reordering the CSV cell changes nothing', () => {
    const a = { ...base, tags: ['stealth', 'buff', 'utility'] };
    const b = { ...base, tags: ['utility', 'stealth', 'buff'] };
    expect(presetRevision(a)).toBe(presetRevision(b));
  });

  it('treats an omitted optional field and an undefined one alike', () => {
    // The generator omits the convenience layer when empty; a hand-built object
    // may carry the key as undefined. Both mean "no durée".
    expect(presetRevision({ ...base, duration: undefined })).toBe(presetRevision(base));
  });

  // The whole point: a rulebook correction must be detectable on rows copied
  // before it. One character of `effect` is enough.
  it.each([
    ['effect', { effect: 'Le mage se dissimule..' }],
    ['difficulty', { difficulty: 13 }],
    ['a filled convenience field', { duration: '1 + NR', durationUnit: 'round' }],
    ['an added tag', { tags: ['stealth'] }],
  ])('changes when %s changes', (_label, patch) => {
    expect(presetRevision({ ...base, ...patch })).not.toBe(presetRevision(base));
  });

  it('is 12 lowercase hex characters', () => {
    expect(presetRevision(base)).toMatch(/^[0-9a-f]{12}$/);
  });

  it('does not collide across the whole spell catalogue', async () => {
    // Not a hash-quality claim — a guard that the CANONICAL FORM discriminates:
    // a serializer dropping a field would silently make distinct spells equal.
    const { SPELL_CATALOG } = await import('@/data/spell-catalog');
    const revisions = SPELL_CATALOG.map((p) => presetRevision(p.data));
    expect(new Set(revisions).size).toBe(SPELL_CATALOG.length);
  });
});
