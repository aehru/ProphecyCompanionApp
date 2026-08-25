import { describe, expect, it } from 'vitest';

import { contextValue, resolveRoll, singleThrow } from './roll';
import { skillRollContext, statRollContext, weaponRollContext } from './roll-context';
import type { WeaponSkillReading } from './weapon-skill';

describe('skillRollContext', () => {
  const ctx = skillRollContext({ name: 'Équitation', total: 12, value: 3 });

  it('adds the TOT and confirms on the points bought', () => {
    expect(contextValue(ctx)).toBe(12);
    expect(ctx.confirm).toBe(3);
  });

  it('does not re-add the modifier the TOT already carries', () => {
    // The row's total is COMP + attribut + bonus; a second modifier part would
    // count wounds twice.
    expect(ctx.parts).toHaveLength(1);
  });
});

describe('statRollContext', () => {
  const base = {
    key: 'volonte',
    label: 'Volonté',
    abbr: 'VOL',
    value: 5,
    kind: 'caracteristique' as const,
  };

  it('confirms on the stat itself, unmodified', () => {
    const ctx = statRollContext({ ...base, effects: [], wound: -3 });
    // The malus reaches the total, never the number a 10 answers to.
    expect(ctx.confirm).toBe(5);
    expect(contextValue(ctx)).toBe(2);
  });

  it('folds in the wound malus and the effects aimed at the stat or at all', () => {
    const ctx = statRollContext({
      ...base,
      effects: [
        { target: 'volonte', value: 2 },
        { target: 'all', value: 1 },
        { target: 'force', value: 9 },
        { target: 'volonte', value: 4, expired: true },
      ],
      wound: -1,
    });
    expect(contextValue(ctx)).toBe(5 + 2 + 1 - 1);
  });

  it('omits the modifier part entirely when nothing applies', () => {
    const ctx = statRollContext({ ...base, effects: [], wound: 0 });
    expect(ctx.parts).toEqual([{ label: 'VOL', value: 5 }]);
  });

  it('names an attribut an attribut, and confirms it on itself', () => {
    const ctx = statRollContext({
      key: 'physique',
      label: 'Physique',
      value: 7,
      kind: 'attribut',
      effects: [],
      wound: 0,
    });
    expect(ctx).toMatchObject({ confirm: 7, confirmLabel: 'Attribut' });
    // No abbr given: the label carries the sum.
    expect(ctx.parts).toEqual([{ label: 'Physique', value: 7 }]);
  });

  it('feeds the engine a total a wound actually moved', () => {
    const ctx = statRollContext({ ...base, effects: [], wound: -3 });
    expect(resolveRoll(singleThrow(8), ctx, 10)).toMatchObject({ total: 10, success: true, nr: 0 });
  });
});

describe('weaponRollContext', () => {
  const resolved: WeaponSkillReading = {
    status: 'ok',
    name: 'Corps à corps',
    attribut: 'physique',
    attributLabel: 'Physique',
    attributValue: 9,
    value: 4,
    bonus: 1,
    total: 14,
    trained: true,
  };

  it('rolls the compétence, but names the roll after the weapon', () => {
    const ctx = weaponRollContext('Épée longue', resolved)!;
    expect(ctx.label).toBe('Épée longue');
    expect(ctx.parts).toEqual([{ label: 'Corps à corps', value: 14 }]);
    expect(ctx).toMatchObject({ confirm: 4, confirmLabel: 'Compétence' });
  });

  it('falls back to the compétence when the weapon has no name', () => {
    expect(weaponRollContext('   ', resolved)!.label).toBe('Corps à corps');
  });

  it('has nothing to roll when the compétence did not resolve', () => {
    expect(weaponRollContext('Arc', { status: 'unset' })).toBeNull();
    expect(weaponRollContext('Arc', { status: 'unknown', name: 'Tir' })).toBeNull();
  });

  it('cannot crit and always confirms its fumble when untrained', () => {
    // value 0: no reroll is strictly under it, every reroll is strictly over.
    const untrained = weaponRollContext('Arc', { ...resolved, value: 0, total: 10, trained: false })!;
    expect(untrained.confirm).toBe(0);
  });
});
