import { describe, expect, it } from 'vitest';

import { detachOrphanSpecs, groupSkills, skillBonus, type SharedSkill } from './skill-groups';

const colors = { physique: '#p', mental: '#m', manuel: '#h', social: '#s' };
const attributs = { physique: 3, mental: 2, manuel: 0, social: 1 };

const skill = (over: Partial<SharedSkill> & { name: string }): SharedSkill => ({
  attribut: 'physique',
  value: 2,
  ...over,
});

describe('skillBonus', () => {
  const effects = [
    { target: 'all', value: 1 },
    { target: 'physique', value: 2 },
    { target: 'skill:Discrétion', value: 3 },
    { target: 'mental', value: -5 },
  ];

  it('sums the effects that reach the skill', () => {
    expect(skillBonus('physique', 'Discrétion', effects)).toBe(6);
  });

  it('ignores effects aimed at another attribut or skill', () => {
    expect(skillBonus('physique', 'Escalade', effects)).toBe(3);
  });

  it('is 0 without effects', () => {
    expect(skillBonus('physique', 'Escalade', [])).toBe(0);
  });

  it('folds in the wound malus — it applies to every roll', () => {
    // wound -5 + all(+1) + physique(+2) + skill(+3) = 1.
    expect(skillBonus('physique', 'Discrétion', effects, -5)).toBe(1);
    expect(skillBonus('physique', 'Escalade', [], -3)).toBe(-3);
  });
});

describe('detachOrphanSpecs', () => {
  const mother = skill({ name: 'Équitation' });
  const spec = skill({ name: 'Équitation (chameau)', parentName: 'Équitation', specLabel: 'chameau' });

  it('keeps a specialization attached when its mother is owned', () => {
    expect(detachOrphanSpecs([mother, spec])[1]).toEqual(spec);
  });

  it('detaches one whose mother is missing, so it renders under its own name', () => {
    const [orphan] = detachOrphanSpecs([spec]);
    expect(orphan).toMatchObject({
      name: 'Équitation (chameau)',
      parentName: null,
      specLabel: null,
    });
    // And the grouping then reads it as a plain skill, not an indented child.
    const [group] = groupSkills(detachOrphanSpecs([spec]), attributs, colors);
    expect(group.skills).toEqual([
      expect.objectContaining({ name: 'Équitation (chameau)', isSpec: false }),
    ]);
  });
});

describe('groupSkills', () => {
  it('groups by attribut in the canonical order and drops empty groups', () => {
    const groups = groupSkills(
      [skill({ name: 'Vigilance', attribut: 'mental' }), skill({ name: 'Escalade' })],
      attributs,
      colors,
    );
    expect(groups.map((g) => g.key)).toEqual(['physique', 'mental']);
    expect(groups[0].color).toBe('#p');
  });

  it('totals value + attribut + bonus', () => {
    const [group] = groupSkills([skill({ name: 'Escalade', value: 4 })], attributs, colors, '', [
      { target: 'all', value: -1 },
    ]);
    expect(group.skills[0]).toMatchObject({ value: 4, bonus: -1, total: 6 });
  });

  it('subtracts the wound malus from every skill total', () => {
    const [group] = groupSkills(
      [skill({ name: 'Escalade', value: 4 })],
      attributs,
      colors,
      '',
      [{ target: 'all', value: -1 }],
      -3,
    );
    // 4 (value) + 3 (physique) + (-3 wound -1 effect) = 3.
    expect(group.skills[0]).toMatchObject({ value: 4, bonus: -4, total: 3 });
  });

  it('renders a specialization under its own label, matching effects on the raw name', () => {
    const [group] = groupSkills(
      [skill({ name: 'Artisanat (forge)', parentName: 'Artisanat', specLabel: 'forge' })],
      attributs,
      colors,
      '',
      [{ target: 'skill:Artisanat (forge)', value: 2 }],
    );
    expect(group.skills[0]).toMatchObject({ name: 'forge', isSpec: true, bonus: 2 });
  });

  it('filters on the skill, specialization or mother name', () => {
    const skills = [
      skill({ name: 'Artisanat (forge)', parentName: 'Artisanat', specLabel: 'forge' }),
      skill({ name: 'Escalade' }),
    ];
    const names = (q: string) =>
      groupSkills(skills, attributs, colors, q).flatMap((g) => g.skills.map((s) => s.name));
    expect(names('forge')).toEqual(['forge']);
    expect(names('artisanat')).toEqual(['forge']);
    expect(names('esc')).toEqual(['Escalade']);
    expect(names('  ')).toHaveLength(2);
  });
});
