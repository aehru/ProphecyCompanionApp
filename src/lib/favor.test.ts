import { describe, expect, it } from 'vitest';

import { GREAT_DRAGONS } from '@/constants/prophecy';
import type { CustomFavor } from '@/db/schema';
import {
  customFavorPreset,
  eluLabel,
  favorDurationLabel,
  favorDurationWarning,
  favorRollLabel,
  favorsForDragon,
  favorsUpTo,
  favorVariantOf,
} from '@/lib/favor';

describe('favor lookup', () => {
  it('carries Brorne’s five Faveurs in order', () => {
    expect(favorsForDragon('brorne').map((f) => f.niveau)).toEqual([1, 2, 3, 4, 5]);
  });

  it('carries all five Faveurs of every Great Dragon', () => {
    for (const d of GREAT_DRAGONS) {
      expect(favorsForDragon(d.key).map((f) => f.niveau), d.key).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('is cumulative up to the Lien, and empty for a non-Élu', () => {
    expect(favorsUpTo('brorne', 3).map((f) => f.nom)).toEqual([
      'La peau de pierre',
      'Les reflets de glaise',
      'Les portes de silice',
    ]);
    expect(favorsUpTo(null, 3)).toEqual([]);
    expect(favorsUpTo('brorne', 0)).toEqual([]);
  });

  it('labels the roll, the durée and the Élu', () => {
    const [peau, glaise, silice, ombre] = favorsForDragon('brorne');
    expect(favorRollLabel(peau)).toBe('Mental + Volonté · Difficulté 10');
    expect(favorRollLabel(ombre)).toBeNull();
    expect(favorDurationLabel(silice)).toBe('3 + NR tours');
    expect(favorDurationLabel(glaise)).toBe('Tendance Dragon tours');
    expect(favorDurationLabel(glaise, { tendance: () => 4 })).toBe('4 tours');
    expect(eluLabel('brorne')).toBe('Élu de Brorne');
    expect(favorRollLabel(favorsForDragon('khy')[1])).toBe('Empathie + Vie en cité · Difficulté 10');
    const porte = favorsForDragon('heyra')[1];
    expect(favorDurationLabel(porte, { carac: () => 6 })).toBe('6 tours');
    expect(favorDurationLabel(porte, { carac: () => 1 })).toBe('1 tour');
  });
});

const houseRow = (over: Partial<CustomFavor> = {}): CustomFavor => ({
  id: 'uuid-1',
  dragon: 'brorne',
  level: 2,
  name: 'Le don inventé',
  description: 'x',
  inGameEffect: '',
  roll: 'Mental + Volonté',
  difficulty: 15,
  usages: '',
  duration: '',
  durationUnit: null,
  presetId: null,
  createdAt: new Date(0),
  ...over,
});

describe('« Maison » Faveurs', () => {
  it('sit alongside the rulebook one of their level, under the same Lien rule', () => {
    const house = [customFavorPreset(houseRow())];
    expect(favorsUpTo('brorne', 2, house).map((f) => f.nom)).toEqual([
      'La peau de pierre',
      'Les reflets de glaise',
      'Le don inventé',
    ]);
    expect(favorsUpTo('brorne', 1, house)).toHaveLength(1);
    // Another dragon's house entry never shows.
    expect(favorsUpTo('khy', 5, house).some((f) => f.custom)).toBe(false);
  });

  it('label a typed roll and keep a blank one silent', () => {
    expect(favorRollLabel(customFavorPreset(houseRow()))).toBe('Mental + Volonté · Difficulté 15');
    expect(favorRollLabel(customFavorPreset(houseRow({ roll: '', difficulty: null })))).toBeNull();
  });

  it('copy a rulebook Faveur into a variant that reads back the same', () => {
    for (const f of favorsForDragon('brorne')) {
      const v = favorVariantOf(f);
      expect(v.presetId).toBe(`brorne-${f.niveau}`);
      const back = customFavorPreset(houseRow({ ...v, id: 'x' } as Partial<CustomFavor>));
      expect(favorRollLabel(back)).toBe(favorRollLabel(f));
      expect(favorDurationLabel(back)).toBe(favorDurationLabel(f));
    }
  });

  it('warn on a durée the grammar refuses', () => {
    expect(favorDurationWarning('3 + NR')).toBeNull();
    expect(favorDurationWarning('')).toBeNull();
    expect(favorDurationWarning('jusqu’à l’aube')).not.toBeNull();
  });
});
