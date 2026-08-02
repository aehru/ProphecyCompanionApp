import { describe, expect, it } from 'vitest';

import { CLE_PARFAITE_BONUS } from '@/constants/prophecy';
import { spellTotal, spellTotalBreakdown, sphereMaxKey } from '@/lib/spell-total';

const REC = {
  sphereFeuMax: 4,
  sphereVentsMax: 2,
  magieInvocatoire: 3,
  magieInstinctive: 1,
  sorcellerie: 5,
};

const feu = { discipline: 'sorcellerie', sphere: 'sphereFeu' };

describe('sphereMaxKey', () => {
  it('maps a sphere key to its character column', () => {
    expect(sphereMaxKey('sphereFeu')).toBe('sphereFeuMax');
  });
});

describe('spellTotal', () => {
  it('adds the sphere max and the discipline stat', () => {
    const t = spellTotal(feu, REC);
    expect(t).toMatchObject({ sphere: 4, discipline: 5, modifier: 0, cle: 0, total: 9 });
  });

  it('treats an unknown sphere as 0 rather than hiding the score', () => {
    const t = spellTotal({ discipline: 'magieInvocatoire', sphere: 'sphereOmbre' }, REC);
    expect(t.sphere).toBe(0);
    expect(t.total).toBe(3);
  });

  it('folds in the wound malus', () => {
    expect(spellTotal(feu, REC, [], -3).total).toBe(6);
  });

  it('folds in effects targeting all, and ignores expired ones', () => {
    const effects = [
      { target: 'all', value: 2 },
      { target: 'all', value: 4, expired: true },
    ];
    expect(spellTotal(feu, REC, effects).total).toBe(11);
  });

  it('ignores effects targeting a single stat — they do not apply to a spell roll', () => {
    const effects = [{ target: 'force', value: 6 }];
    expect(spellTotal(feu, REC, effects).total).toBe(9);
  });

  it('stacks wound and all-effects into one modifier term', () => {
    const t = spellTotal(feu, REC, [{ target: 'all', value: 1 }], -5);
    expect(t.modifier).toBe(-4);
    expect(t.total).toBe(5);
  });

  it('adds the clé parfaite bonus as its own term', () => {
    const t = spellTotal({ ...feu, cleParfaite: true }, REC);
    expect(t.cle).toBe(CLE_PARFAITE_BONUS);
    expect(t.total).toBe(9 + CLE_PARFAITE_BONUS);
  });

  it('defaults every missing column to 0', () => {
    expect(spellTotal({ discipline: 'sorcellerie', sphere: 'sphereFeu' }, {}).total).toBe(0);
  });
});

describe('spellTotalBreakdown', () => {
  it('spells out the two stats', () => {
    expect(spellTotalBreakdown(spellTotal(feu, REC), feu)).toBe('Feu 4 + Sorcellerie 5');
  });

  it('renders a negative modifier as a subtraction', () => {
    expect(spellTotalBreakdown(spellTotal(feu, REC, [], -2), feu)).toBe('Feu 4 + Sorcellerie 5 − 2');
  });

  it('renders a positive modifier and the clé', () => {
    const spell = { ...feu, cleParfaite: true };
    const t = spellTotal(spell, REC, [{ target: 'all', value: 3 }]);
    expect(spellTotalBreakdown(t, spell)).toBe(`Feu 4 + Sorcellerie 5 + 3 + clé ${CLE_PARFAITE_BONUS}`);
  });
});
