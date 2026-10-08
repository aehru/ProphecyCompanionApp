import { describe, expect, it } from 'vitest';

import { GREAT_DRAGONS } from '@/constants/prophecy';
import { eluLabel, favorDurationLabel, favorRollLabel, favorsForDragon, favorsUpTo } from '@/lib/favor';

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
