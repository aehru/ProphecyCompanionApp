import { describe, expect, it } from 'vitest';

import { diffShares, projectionSignature } from './campaign-live';
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

describe('projectionSignature', () => {
  it('is stable for identical projections', () => {
    expect(projectionSignature(projection())).toBe(projectionSignature(projection()));
  });

  it('changes when an in-play value changes', () => {
    const base = projectionSignature(projection());
    expect(
      projectionSignature(projection({ wounds: { egratignure: { current: 0, max: 3 }, grave: { current: 3, max: 5 } } })),
    ).not.toBe(base);
    expect(
      projectionSignature(projection({ resources: { maitrise: { current: 0, max: 6 }, chance: { current: 4, max: 4 } } })),
    ).not.toBe(base);
    expect(projectionSignature(projection({ conditions: 'À terre' }))).not.toBe(base);
    expect(projectionSignature(projection({ initiative: { max: 3, values: [1] } }))).not.toBe(base);
    expect(projectionSignature(projection({ tendances: { dragon: 2, dragonSub: 3 } }))).not.toBe(base);
  });

  it('changes when sheet stats change (edits sync to the GM while live)', () => {
    const base = projectionSignature(projection());
    expect(projectionSignature(projection({ caracteristiques: { force: 9, empathie: 2 } }))).not.toBe(base);
    expect(projectionSignature(projection({ attributs: { physique: 9 } }))).not.toBe(base);
    // A wound/resource MAX is sheet data too — it syncs now.
    expect(
      projectionSignature(projection({ wounds: { egratignure: { current: 0, max: 9 }, grave: { current: 1, max: 5 } } })),
    ).not.toBe(base);
    expect(
      projectionSignature(
        projection({ skills: [{ name: 'Épée', attribut: 'physique', value: 3, parentName: null, specLabel: null }] }),
      ),
    ).not.toBe(base);
  });

  it('changes when an active bonus/malus effect changes', () => {
    const base = projectionSignature(projection());
    const eff = {
      label: 'Bénédiction',
      target: 'coordination',
      value: 2,
      durationUnit: 'round',
      durationRemaining: 3,
    };
    expect(projectionSignature(projection({ effects: [eff] }))).not.toBe(base);
    // Duration tick-down is a change too.
    expect(projectionSignature(projection({ effects: [{ ...eff, durationRemaining: 2 }] }))).not.toBe(
      projectionSignature(projection({ effects: [eff] })),
    );
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
