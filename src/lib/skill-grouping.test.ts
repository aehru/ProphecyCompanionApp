import { describe, expect, it } from 'vitest';

import type { Skill } from '@/db/schema';
import type { SkillRow } from './character-values';
import { groupSpecsByMother, orphanGroups, visibleRows } from './skill-grouping';

const row = (name: string, attribut: string, value = '2'): SkillRow => ({
  name,
  attribut,
  value,
  isCustom: false,
});

const spec = (id: number, name: string, parentName: string | null, attribut: string): Skill =>
  ({ id, name, parentName, attribut, value: 3, specLabel: name.split(' ').pop() ?? '' }) as Skill;

describe('visibleRows', () => {
  const rows = [row('Discrétion', 'physique'), row('Vigilance', 'mental')];

  it('keeps the active attribut when not searching', () => {
    const out = visibleRows(rows, { searching: false, query: '', activeAttr: 'mental' });
    expect(out.map((v) => v.row.name)).toEqual(['Vigilance']);
  });

  it('searches across every attribut', () => {
    const out = visibleRows(rows, { searching: true, query: 'dis', activeAttr: 'mental' });
    expect(out.map((v) => v.row.name)).toEqual(['Discrétion']);
  });

  it('carries the index of the row in the source array', () => {
    const out = visibleRows(rows, { searching: false, query: '', activeAttr: 'mental' });
    expect(out[0].index).toBe(1);
  });
});

describe('groupSpecsByMother', () => {
  it('groups by parent and ignores base skills', () => {
    const map = groupSpecsByMother([
      spec(1, 'Artisanat (forge)', 'Artisanat', 'physique'),
      spec(2, 'Artisanat (cuir)', 'Artisanat', 'physique'),
      spec(3, 'Vigilance', null, 'mental'),
    ]);
    expect(map.get('Artisanat')).toHaveLength(2);
    expect(map.size).toBe(1);
  });
});

describe('orphanGroups', () => {
  const specs = [spec(1, 'Bricolage (serrures)', 'Bricolage', 'physique')];

  it('surfaces specializations whose mother is not a visible row', () => {
    const groups = orphanGroups([row('Discrétion', 'physique')], specs, {
      searching: false,
      query: '',
      activeAttr: 'physique',
    });
    expect(groups).toEqual([['Bricolage', specs]]);
  });

  it('stays quiet when the mother IS a row', () => {
    const groups = orphanGroups([row('Bricolage', 'physique')], specs, {
      searching: false,
      query: '',
      activeAttr: 'physique',
    });
    expect(groups).toEqual([]);
  });

  it('matches a search on the mother name or the specialization name', () => {
    const opts = { searching: true, activeAttr: 'mental' };
    expect(orphanGroups([], specs, { ...opts, query: 'brico' })).toHaveLength(1);
    expect(orphanGroups([], specs, { ...opts, query: 'serrur' })).toHaveLength(1);
    expect(orphanGroups([], specs, { ...opts, query: 'épée' })).toHaveLength(0);
  });
});
