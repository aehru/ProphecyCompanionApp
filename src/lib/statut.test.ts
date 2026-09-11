import { describe, expect, it } from 'vitest';

import { CASTES } from '@/constants/prophecy';
import { rungsUpTo, statutFor, statutLabel, statutsForCaste } from '@/lib/statut';

describe('statut lookup', () => {
  it('finds a rung by caste and level', () => {
    const rung = statutFor('combattant', 4);
    expect(rung?.nom).toBe("Maître d'armes");
    expect(rung?.technique?.nom).toBe('La voie du maître');
  });

  it('has nothing for « Sans Caste », for level 0, or for a caste it does not know', () => {
    expect(statutFor(null, 3)).toBeNull();
    expect(statutFor('artisan', 0)).toBeNull();
    // All eight castes are typed in now, so the miss is an unknown key — which a
    // raw DB edit or a hand-written import file can still produce.
    expect(statutFor('kalimsshar', 1)).toBeNull();
    expect(statutFor('artisan', 6)).toBeNull();
  });

  it('carries all five rungs of every caste', () => {
    for (const c of CASTES) {
      expect(statutsForCaste(c.key).map((s) => s.niveau), c.key).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('returns a caste ladder in ascending order', () => {
    const ladder = statutsForCaste('artisan');
    expect(ladder.map((s) => s.niveau)).toEqual([1, 2, 3, 4, 5]);
    expect(statutsForCaste('kalimsshar')).toEqual([]);
  });

  it('labels with the rulebook Roman numeral, and with the number alone when the rung is unknown', () => {
    expect(statutLabel('artisan', 2)).toBe('II · Compagnon');
    expect(statutLabel('kalimsshar', 2)).toBe('II');
    expect(statutLabel('artisan', 0)).toBeNull();
  });

  it('keeps every rung already climbed', () => {
    // A Maître d'armes still has the Apprenti's « L'œil du maître ».
    expect(rungsUpTo('combattant', 4).map((s) => s.niveau)).toEqual([1, 2, 3, 4]);
    expect(rungsUpTo('combattant', 1).map((s) => s.nom)).toEqual(['Apprenti']);
    expect(rungsUpTo('combattant', 0)).toEqual([]);
    expect(rungsUpTo(null, 3)).toEqual([]);
  });
});
