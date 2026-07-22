import { describe, expect, it } from 'vitest';

import { diffShares, inPlaySignature } from './campaign-live';
import type { SharedCharacter } from './character-share';

function projection(over: Partial<SharedCharacter> = {}): SharedCharacter {
  return {
    nom: 'Kael',
    caracteristiques: { force: 4, empathie: 2 },
    attributs: { physique: 5 },
    tendances: { dragon: 2, dragonSub: 7 },
    wounds: { egratignure: { current: 0, max: 3 }, grave: { current: 1, max: 5 } },
    resources: { maitrise: { current: 2, max: 6 }, chance: { current: 4, max: 4 } },
    initiative: { max: 3, values: [12, 7] },
    conditions: '',
    skills: [],
    effects: [],
    ...over,
  } as SharedCharacter;
}

describe('inPlaySignature', () => {
  it('is stable for identical projections', () => {
    expect(inPlaySignature(projection())).toBe(inPlaySignature(projection()));
  });

  it('does NOT change when only frozen sheet stats change', () => {
    const base = inPlaySignature(projection());
    // Caractéristiques & attributs are frozen at activation.
    expect(inPlaySignature(projection({ caracteristiques: { force: 9, empathie: 2 } }))).toBe(base);
    expect(inPlaySignature(projection({ attributs: { physique: 9 } }))).toBe(base);
    // A wound/resource MAX is a sheet value — must not trigger a push.
    expect(
      inPlaySignature(projection({ wounds: { egratignure: { current: 0, max: 9 }, grave: { current: 1, max: 5 } } })),
    ).toBe(base);
  });

  it('changes when an in-play value changes', () => {
    const base = inPlaySignature(projection());
    expect(
      inPlaySignature(projection({ wounds: { egratignure: { current: 0, max: 3 }, grave: { current: 3, max: 5 } } })),
    ).not.toBe(base);
    expect(
      inPlaySignature(projection({ resources: { maitrise: { current: 0, max: 6 }, chance: { current: 4, max: 4 } } })),
    ).not.toBe(base);
    expect(inPlaySignature(projection({ conditions: 'À terre' }))).not.toBe(base);
    expect(inPlaySignature(projection({ initiative: { max: 3, values: [1] } }))).not.toBe(base);
  });

  it('changes when a tendance or its bullets change (in-play now)', () => {
    const base = inPlaySignature(projection());
    expect(inPlaySignature(projection({ tendances: { dragon: 5, dragonSub: 7 } }))).not.toBe(base);
    // Only the bullet (sub) moved.
    expect(inPlaySignature(projection({ tendances: { dragon: 2, dragonSub: 3 } }))).not.toBe(base);
  });

  it('changes when an active bonus/malus effect changes (in-play)', () => {
    const base = inPlaySignature(projection());
    const eff = {
      label: 'Bénédiction',
      target: 'coordination',
      value: 2,
      durationUnit: 'round',
      durationRemaining: 3,
    };
    expect(inPlaySignature(projection({ effects: [eff] }))).not.toBe(base);
    // Duration tick-down is an in-play change too.
    expect(inPlaySignature(projection({ effects: [{ ...eff, durationRemaining: 2 }] }))).not.toBe(
      inPlaySignature(projection({ effects: [eff] })),
    );
  });

  it('does NOT change when only the skills list changes (frozen sheet data)', () => {
    const base = inPlaySignature(projection());
    expect(
      inPlaySignature(
        projection({ skills: [{ name: 'Épée', attribut: 'physique', value: 3, parentName: null, specLabel: null }] }),
      ),
    ).toBe(base);
  });
});

describe('diffShares', () => {
  it('reports added and removed uuids', () => {
    expect(diffShares(['a', 'b'], ['b', 'c'])).toEqual({ added: ['c'], removed: ['a'] });
  });

  it('is empty on identical sets (order-insensitive)', () => {
    expect(diffShares(['a', 'b'], ['b', 'a'])).toEqual({ added: [], removed: [] });
  });

  it('handles empty-to-shared and shared-to-empty transitions', () => {
    expect(diffShares([], ['a'])).toEqual({ added: ['a'], removed: [] });
    expect(diffShares(['a', 'b'], [])).toEqual({ added: [], removed: ['a', 'b'] });
    expect(diffShares([], [])).toEqual({ added: [], removed: [] });
  });
});
