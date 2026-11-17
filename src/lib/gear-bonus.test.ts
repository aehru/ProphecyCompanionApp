import { describe, expect, it } from 'vitest';

import {
  applyShieldBonus,
  applyWeaponBonus,
  gearTarget,
  gearTargetOptions,
  remapGearTarget,
  withDamageBonus,
  withHitBonus,
} from '@/lib/gear-bonus';
import { formulaResult } from '@/lib/formula';
import { effectsSum } from '@/lib/modifiers';

const weapon = {
  id: 7,
  damage: 'FOR x2 +3',
  initMelee: 1,
  initCorpsACorps: -1,
  hitBonus: 2,
  damageBonus: 1,
  initBonus: 1,
};

describe('applyWeaponBonus', () => {
  it('sums permanent and active temporary bonuses', () => {
    const v = applyWeaponBonus(weapon, [
      { target: gearTarget('weapon', 7, 'hit'), value: 3 },
      { target: gearTarget('weapon', 7, 'hit'), value: 9, expired: true },
      { target: gearTarget('weapon', 8, 'hit'), value: 9 },
      { target: gearTarget('weapon', 7, 'damage'), value: 1 },
      { target: gearTarget('weapon', 7, 'init'), value: -3 },
    ]);
    expect(v.hitBonus).toBe(5);
    expect(v.damage).toBe('FOR x2 +3 +2');
    expect(v.initMelee).toBe(-1);
    expect(v.initCorpsACorps).toBe(-3);
  });

  it('adds damage after the multiplier in a real formula', () => {
    const carac = () => 4;
    const dmg = (raw: string) => formulaResult(raw, { carac });
    expect(dmg(withDamageBonus('FOR x2 +3', 2))).toBe(dmg('FOR x2 +5'));
    expect(dmg(withDamageBonus('FOR x2 +3', -1))).toBe(dmg('FOR x2 +2'));
  });

  it('leaves an empty damage empty', () => {
    expect(withDamageBonus('  ', 3)).toBe('  ');
  });
});

describe('applyShieldBonus', () => {
  it('reads only its own targets', () => {
    const s = { id: 7, damage: 'FOR', hitBonus: 0, damageBonus: 1 };
    const v = applyShieldBonus(s, [
      { target: gearTarget('shield', 7, 'hit'), value: 2 },
      { target: gearTarget('weapon', 7, 'hit'), value: 9 },
    ]);
    expect(v.hitBonus).toBe(2);
    expect(v.damage).toBe('FOR +1');
  });
});

describe('withHitBonus', () => {
  it('moves total and bonus, and ignores an unresolved reading', () => {
    const ok = {
      status: 'ok',
      name: 'x',
      attribut: 'a',
      attributLabel: 'A',
      attributValue: 3,
      value: 4,
      bonus: 1,
      total: 8,
      trained: true,
    } as const;
    expect(withHitBonus(ok, 2)).toMatchObject({ bonus: 3, total: 10, value: 4 });
    expect(withHitBonus({ status: 'unset' }, 2)).toEqual({ status: 'unset' });
  });
});

describe('gear targets', () => {
  it('stay out of every other roll', () => {
    expect(effectsSum('force', [{ target: gearTarget('weapon', 1, 'hit'), value: 5 }])).toBe(0);
  });

  it('remap gear only, and drop what does not resolve', () => {
    const resolve = (_: string, n: number) => (n === 3 ? 0 : undefined);
    expect(remapGearTarget('weapon:3:hit', resolve)).toBe('weapon:0:hit');
    expect(remapGearTarget('shield:4:damage', resolve)).toBeNull();
    expect(remapGearTarget('skill:weapon:3:hit', resolve)).toBe('skill:weapon:3:hit');
    expect(remapGearTarget('all', resolve)).toBe('all');
  });

  it('offer no initiative on a shield', () => {
    const keys = gearTargetOptions([{ id: 1, name: 'Épée' }], [{ id: 2, name: '' }]).map((o) => o.key);
    expect(keys).toEqual([
      'weapon:1:hit',
      'weapon:1:damage',
      'weapon:1:init',
      'shield:2:hit',
      'shield:2:damage',
    ]);
  });
});
