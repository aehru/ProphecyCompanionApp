import { describe, expect, it } from 'vitest';

import { WEAPON_CATALOG } from '@/data/weapon-catalog';
import {
  buildWeaponIndex,
  groupWeapons,
  type GroupablePreset,
} from '@/lib/weapon-grouping';

const preset = (
  id: string,
  category: GroupablePreset['category'],
  hands: GroupablePreset['hands'],
  name: string,
) => ({ id, category, hands, data: { name } });

const SAMPLE = [
  preset('epee-courte', 'Armes tranchantes', 'Une main', 'Épée courte'),
  preset('espadon', 'Armes tranchantes', 'Deux mains', 'Espadon'),
  preset('dague', 'Armes tranchantes', 'Une main', 'Dague'),
  preset('masse', 'Armes de choc', 'Une main', 'Masse d’armes'),
  preset('arc', 'Armes à projectile', 'Deux mains', 'Arc long'),
];
const INDEX = buildWeaponIndex(SAMPLE);

describe('groupWeapons', () => {
  it('groups by catégorie then by maniement', () => {
    const { groups } = groupWeapons(INDEX, '');
    const tranchantes = groups.find((g) => g.category === 'Armes tranchantes');
    expect(tranchantes?.hands.map((h) => h.hand)).toEqual(['Une main', 'Deux mains']);
    expect(tranchantes?.hands[0].items.map((p) => p.id)).toEqual(['epee-courte', 'dague']);
    expect(tranchantes?.hands[1].items.map((p) => p.id)).toEqual(['espadon']);
  });

  it('emits catégories in taxonomy order, not in bucket order', () => {
    // 'Armes de choc' is declared after 'Armes tranchantes' but before
    // 'Armes à projectile', whatever order the rows arrived in.
    const { groups } = groupWeapons(INDEX, '');
    expect(groups.map((g) => g.category)).toEqual([
      'Armes tranchantes',
      'Armes de choc',
      'Armes à projectile',
    ]);
  });

  it('counts every match across groups', () => {
    expect(groupWeapons(INDEX, '').total).toBe(SAMPLE.length);
    expect(groupWeapons(INDEX, 'arme').total).toBe(1);
  });

  it('drops catégories and maniements with no match rather than emitting them empty', () => {
    const { groups } = groupWeapons(INDEX, 'espadon');
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('Armes tranchantes');
    expect(groups[0].hands).toHaveLength(1);
    expect(groups[0].hands[0].hand).toBe('Deux mains');
  });

  it('matches on the folded name, so accents and case never have to be typed', () => {
    // « epee » must find « Épée courte » — the whole reason lib/text-fold exists.
    expect(groupWeapons(INDEX, 'epee').total).toBe(1);
    expect(groupWeapons(INDEX, 'EPEE').total).toBe(0); // caller folds the query
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(groupWeapons(INDEX, 'zzz')).toEqual({ groups: [], total: 0 });
  });

  it('keeps every real catalogue preset reachable', () => {
    // The grouping is the only path from the catalogue to the screen: a preset
    // in no group is a weapon nobody can pick.
    const { groups, total } = groupWeapons(buildWeaponIndex(WEAPON_CATALOG), '');
    const seen = groups.flatMap((g) => g.hands.flatMap((h) => h.items));
    expect(total).toBe(WEAPON_CATALOG.length);
    expect(seen).toHaveLength(WEAPON_CATALOG.length);
    expect(new Set(seen.map((p) => p.id)).size).toBe(WEAPON_CATALOG.length);
  });
});
