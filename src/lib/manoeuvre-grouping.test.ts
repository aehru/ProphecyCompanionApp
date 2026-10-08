import { describe, expect, it } from 'vitest';

import { MANOEUVRE_CATALOG } from '@/data/manoeuvre-catalog';
import { foldQuery } from '@/lib/text-fold';

import { buildManoeuvreIndex, groupManoeuvres } from './manoeuvre-grouping';

const INDEX = buildManoeuvreIndex(MANOEUVRE_CATALOG);
const ids = (query: string) =>
  groupManoeuvres(INDEX, foldQuery(query)).groups.flatMap((g) =>
    g.families.flatMap((f) => f.items.map((m) => m.id)),
  );

describe('groupManoeuvres', () => {
  it('keeps the whole catalogue, in taxonomy then rulebook order, with no query', () => {
    const { groups, total } = groupManoeuvres(INDEX, '');
    expect(total).toBe(MANOEUVRE_CATALOG.length);
    expect(groups.map((g) => g.contexte)).toEqual([
      'melee',
      'corps-a-corps',
      'monte',
      'situations',
      'critiques',
    ]);
    expect(ids('').slice(0, 3)).toEqual([
      'melee-attaque-simple',
      'melee-attaque-brutale',
      'melee-attaque-precise',
    ]);
  });

  it('matches the name loosely, and the text too', () => {
    expect(ids('ECRASER')).toContain('cac-ecraser');
    // « sable » is only in the paragraph of Attaques déroutantes.
    expect(ids('sable')).toContain('melee-attaques-deroutantes');
  });

  it('drops empty groups and counts what is left', () => {
    const { groups, total } = groupManoeuvres(INDEX, foldQuery('désarçonner'));
    expect(total).toBe(1);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ contexte: 'monte', count: 1 });
    expect(groupManoeuvres(INDEX, 'zzzz')).toEqual({ groups: [], total: 0 });
  });
});
