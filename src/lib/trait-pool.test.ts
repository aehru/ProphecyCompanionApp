import { describe, expect, it } from 'vitest';

import {
  traitCostLabel,
  traitOwnedBadge,
  traitPool,
  traitUnaffordable,
} from '@/lib/trait-pool';

describe('traitPool', () => {
  it('is empty for a character with no traits', () => {
    expect(traitPool([])).toEqual({ gained: 0, spent: 0, balance: 0 });
  });

  it('grants on the désavantages and spends on the avantages', () => {
    const pool = traitPool([
      { kind: 'desavantage', cost: 3 },
      { kind: 'desavantage', cost: 2 },
      { kind: 'avantage', cost: 4 },
    ]);
    expect(pool).toEqual({ gained: 5, spent: 4, balance: 1 });
  });

  it('reports an overspend as a negative balance rather than clamping it', () => {
    // A debt is a legitimate state: nothing in the app enforces the pool, and
    // hiding it at 0 would tell the player they are square when they are not.
    expect(traitPool([{ kind: 'avantage', cost: 6 }]).balance).toBe(-6);
  });

  it('ignores a negative cost instead of letting it reverse its side', () => {
    // Only reachable through a hand-edited import file. Counting it would make a
    // désavantage take points away — the opposite of what the row says it does.
    const pool = traitPool([
      { kind: 'desavantage', cost: -5 },
      { kind: 'desavantage', cost: 2 },
    ]);
    expect(pool).toEqual({ gained: 2, spent: 0, balance: 2 });
  });
});

describe('traitOwnedBadge', () => {
  it('says nothing about an entry the character has not taken', () => {
    expect(traitOwnedBadge(undefined)).toBeUndefined();
    expect(traitOwnedBadge(0)).toBeUndefined();
  });

  it('counts the copies beyond the first', () => {
    // Several entries are « peut survenir plusieurs fois »: a second Dette is a
    // legitimate pick, and the badge has to say so rather than warn against it.
    expect(traitOwnedBadge(1)).toBe('Déjà ajouté');
    expect(traitOwnedBadge(3)).toBe('Déjà ajouté ×3');
  });
});

describe('traitUnaffordable', () => {
  const pool = traitPool([
    { kind: 'desavantage', cost: 3 },
    { kind: 'avantage', cost: 1 },
  ]); // balance 2

  it('flags an avantage that costs more than the balance', () => {
    expect(traitUnaffordable({ kind: 'avantage', costs: [3] }, pool)).toBe(true);
    expect(traitUnaffordable({ kind: 'avantage', costs: [2] }, pool)).toBe(false);
  });

  it('judges a tiered entry on its cheapest tier', () => {
    // Offered at 1, 2 or 3 with two points left: affordable at 1.
    expect(traitUnaffordable({ kind: 'avantage', costs: [1, 2, 3] }, pool)).toBe(false);
    expect(traitUnaffordable({ kind: 'avantage', costs: [3, 5] }, pool)).toBe(true);
  });

  it('never flags a désavantage — it grants points rather than spending them', () => {
    expect(traitUnaffordable({ kind: 'desavantage', costs: [5] }, pool)).toBe(false);
  });

  it('flags nothing without a pool (the catalogue read outside any character)', () => {
    expect(traitUnaffordable({ kind: 'avantage', costs: [99] })).toBe(false);
  });
});

describe('traitCostLabel', () => {
  it('agrees in number with a single price', () => {
    expect(traitCostLabel([1])).toBe('1 point');
    expect(traitCostLabel([3])).toBe('3 points');
  });

  it('reads a tier list as a French list', () => {
    expect(traitCostLabel([1, 2])).toBe('1 ou 2 points');
    expect(traitCostLabel([1, 3, 5])).toBe('1, 3 ou 5 points');
  });

  it('collapses a long unbroken run to its bounds', () => {
    // « Fortune personnelle » is priced *variable* in the rulebook and carried as
    // 1-10: spelling out ten values would be unreadable.
    const wide = Array.from({ length: 10 }, (_, i) => i + 1);
    expect(traitCostLabel(wide)).toBe('de 1 à 10 points');
    expect(traitCostLabel([1, 2, 3, 4])).toBe('de 1 à 4 points');
  });

  it('still spells out the rulebook’s own tiers', () => {
    // Non-contiguous, so it stays a list however long it gets…
    expect(traitCostLabel([1, 3, 5])).toBe('1, 3 ou 5 points');
    // …and a short run reads better spelled out than as bounds.
    expect(traitCostLabel([1, 2])).toBe('1 ou 2 points');
    expect(traitCostLabel([1, 2, 3])).toBe('1, 2 ou 3 points');
  });

  it('says nothing about an entry with no price', () => {
    expect(traitCostLabel([])).toBe('');
  });
});
