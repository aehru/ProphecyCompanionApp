import { describe, expect, it } from 'vitest';

import { CATEGORY_SKILL, WEAPON_CATEGORIES } from '@/data/weapon-constants';
import { WEAPON_CATALOG } from '@/data/weapon-catalog';
import { DEFAULT_SKILLS } from '@/constants/prophecy';
import {
  skillOptions,
  specializationsOf,
  weaponSkillReading,
  type WeaponSkillSource,
} from './weapon-skill';

const attributs = { physique: 5, mental: 2, manuel: 3, social: 1 };

const skill = (over: Partial<WeaponSkillSource> & { name: string }): WeaponSkillSource => ({
  attribut: 'physique',
  value: 4,
  ...over,
});

describe('CATEGORY_SKILL', () => {
  it('maps every weapon category', () => {
    for (const cat of WEAPON_CATEGORIES) expect(CATEGORY_SKILL[cat]).toBeTruthy();
  });

  // The whole point of the map: a category is a picker taxonomy, a compétence
  // is a rules object, and a name that isn't in DEFAULT_SKILLS silently gives
  // every weapon of that family an unresolvable skill.
  it('only maps to real DEFAULT_SKILLS names', () => {
    const names = new Set(DEFAULT_SKILLS.map((d) => d.name));
    for (const cat of WEAPON_CATEGORIES) expect(names).toContain(CATEGORY_SKILL[cat]);
  });

  it('renames the three categories whose skill has another name', () => {
    expect(CATEGORY_SKILL['Armes de corps à corps']).toBe('Corps à corps');
    expect(CATEGORY_SKILL['Armes à projectile']).toBe('Armes à projectiles');
    expect(CATEGORY_SKILL['Armes mécaniques']).toBe('Armes mécanique');
  });
});

describe('the generated catalogue', () => {
  it('gives every preset the skill its category maps to', () => {
    for (const p of WEAPON_CATALOG) {
      expect(p.data.skillName, p.data.name ?? p.id).toBe(CATEGORY_SKILL[p.category]);
    }
  });

  it('sends bows and crossbows to a MANUEL compétence, not physique', () => {
    const byName = new Map(DEFAULT_SKILLS.map((d) => [d.name, d.attribut]));
    const arc = WEAPON_CATALOG.find((p) => p.id === 'arc-long');
    const arbalete = WEAPON_CATALOG.find((p) => p.category === 'Armes mécaniques');
    expect(byName.get(arc!.data.skillName!)).toBe('manuel');
    expect(byName.get(arbalete!.data.skillName!)).toBe('manuel');
  });
});

describe('weaponSkillReading', () => {
  it('reports an unset link', () => {
    expect(weaponSkillReading(null, [], attributs)).toEqual({ status: 'unset' });
    expect(weaponSkillReading('   ', [], attributs)).toEqual({ status: 'unset' });
  });

  it('reports a name that matches nothing', () => {
    expect(weaponSkillReading('Jonglage explosif', [], attributs)).toEqual({
      status: 'unknown',
      name: 'Jonglage explosif',
    });
  });

  it('totals attribut + points for a trained skill', () => {
    const r = weaponSkillReading('Armes contondantes', [skill({ name: 'Armes contondantes' })], attributs);
    expect(r).toMatchObject({ status: 'ok', attribut: 'physique', value: 4, bonus: 0, total: 9 });
  });

  // replaceSkills never persists a value-0 base skill, so an untrained skill is
  // simply absent from the rows — it must still resolve, through the catalogue.
  it('falls back to the catalogue for an unbought skill, at the attribut alone', () => {
    const r = weaponSkillReading('Armes contondantes', [], attributs);
    expect(r).toMatchObject({ status: 'ok', value: 0, trained: false, total: 5 });
  });

  it('reads the attribut off the skill, so a bow rolls Manuel', () => {
    const r = weaponSkillReading('Armes à projectiles', [], attributs);
    expect(r).toMatchObject({ status: 'ok', attribut: 'manuel', attributLabel: 'Manuel', total: 3 });
  });

  it('stacks the wound malus and the effects the way a skill roll does', () => {
    const effects = [
      { target: 'physique', value: 2 },
      { target: 'all', value: 1 },
      { target: 'skill:Armes contondantes', value: 3 },
      { target: 'skill:Armes tranchantes', value: 99 },
      { target: 'all', value: 50, expired: true },
    ];
    const r = weaponSkillReading(
      'Armes contondantes',
      [skill({ name: 'Armes contondantes' })],
      attributs,
      effects,
      -5,
    );
    // 5 (physique) + 4 (points) + [2 + 1 + 3 - 5] = 10
    expect(r).toMatchObject({ status: 'ok', bonus: 1, total: 10 });
  });

  it('resolves a spécialisation by its composite name, with its own points', () => {
    const rows = [
      skill({ name: 'Armes tranchantes', value: 4 }),
      skill({ name: 'Armes tranchantes (Épée longue)', value: 7, parentName: 'Armes tranchantes', specLabel: 'Épée longue' }),
    ];
    const r = weaponSkillReading('Armes tranchantes (Épée longue)', rows, attributs);
    expect(r).toMatchObject({ status: 'ok', value: 7, total: 12 });
  });

  it('applies an effect targeting the spécialisation, not its mother', () => {
    const rows = [
      skill({ name: 'Armes tranchantes (Épée longue)', value: 7, parentName: 'Armes tranchantes', specLabel: 'Épée longue' }),
    ];
    const effects = [{ target: 'skill:Armes tranchantes', value: 4 }];
    const r = weaponSkillReading('Armes tranchantes (Épée longue)', rows, attributs, effects);
    expect(r).toMatchObject({ bonus: 0, total: 12 });
  });
});

describe('skillOptions', () => {
  it('offers the whole catalogue, grouped in attribut order', () => {
    const groups = skillOptions([]);
    expect(groups.map((g) => g.key)).toEqual(['physique', 'mental', 'manuel', 'social']);
    const total = groups.reduce((n, g) => n + g.options.length, 0);
    expect(total).toBe(DEFAULT_SKILLS.length);
  });

  it('sorts each group A→Z ignoring accents', () => {
    const physique = skillOptions([]).find((g) => g.key === 'physique')!;
    const names = physique.options.map((o) => o.name);
    expect(names).toEqual([...names].sort((a, b) => (fold(a) < fold(b) ? -1 : 1)));
    // « Équitation » sorts under E, not after Z.
    expect(names.indexOf('Equitation')).toBeLessThan(names.indexOf('Escalade'));
  });

  it('merges the character points in and flags what is unbought', () => {
    const groups = skillOptions([skill({ name: 'Armes contondantes', value: 3 })]);
    const opts = groups.find((g) => g.key === 'physique')!.options;
    expect(opts.find((o) => o.name === 'Armes contondantes')).toMatchObject({
      value: 3,
      trained: true,
    });
    expect(opts.find((o) => o.name === 'Esquive')).toMatchObject({ value: 0, trained: false });
  });

  it('appends custom skills and leaves spécialisations out (they are step two)', () => {
    const groups = skillOptions([
      skill({ name: 'Lancer de bombe', attribut: 'manuel', value: 2 }),
      skill({ name: 'Armes tranchantes (Épée longue)', parentName: 'Armes tranchantes', specLabel: 'Épée longue' }),
    ]);
    const manuel = groups.find((g) => g.key === 'manuel')!.options.map((o) => o.name);
    expect(manuel).toContain('Lancer de bombe');
    const all = groups.flatMap((g) => g.options.map((o) => o.name));
    expect(all).not.toContain('Armes tranchantes (Épée longue)');
  });

  it('filters on an accent-insensitive query', () => {
    const groups = skillOptions([], 'equit');
    expect(groups.flatMap((g) => g.options.map((o) => o.name))).toEqual(['Equitation']);
  });
});

describe('specializationsOf', () => {
  it('returns only that mother’s specs, ordered by label', () => {
    const rows = [
      skill({ name: 'Armes tranchantes (Sabre)', parentName: 'Armes tranchantes', specLabel: 'Sabre' }),
      skill({ name: 'Armes tranchantes (Épée)', parentName: 'Armes tranchantes', specLabel: 'Épée' }),
      skill({ name: 'Esquive (Roulade)', parentName: 'Esquive', specLabel: 'Roulade' }),
      skill({ name: 'Armes tranchantes' }),
    ];
    expect(specializationsOf('Armes tranchantes', rows).map((s) => s.specLabel)).toEqual([
      'Épée',
      'Sabre',
    ]);
  });
});

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
