import { describe, expect, it } from 'vitest';

import {
  activeFilterCount,
  buildSpellSections,
  compareSpellEntries,
  hasActiveFilters,
  matchesCriteria,
  NO_FILTERS,
  type SpellCatalogEntry,
  type SpellFilterCriteria,
} from '@/lib/spell-catalog-filter';
import { foldQuery } from '@/lib/text-fold';

const SPHERES = [
  { key: 'sphereFeu', label: 'Sphère du feu' },
  { key: 'sphereEau', label: "Sphère de l'eau" },
];

/** Mirrors how the screen indexes a preset: one name, both derived keys. */
const entry = (over: Partial<SpellCatalogEntry> & { name?: string } = {}): SpellCatalogEntry => {
  const { name = 'sort', ...rest } = over;
  return {
    search: foldQuery(name),
    sortKey: name.toLowerCase(),
    discipline: 'sorcellerie',
    sphere: 'sphereFeu',
    level: '1',
    tags: [],
    ...rest,
  };
};

const criteria = (over: Partial<SpellFilterCriteria> = {}): SpellFilterCriteria => ({
  ...NO_FILTERS,
  ...over,
});

const NONE: ReadonlySet<string> = new Set();
const names = (entries: readonly SpellCatalogEntry[]) => entries.map((e) => e.sortKey);

describe('compareSpellEntries', () => {
  it('sorts by niveau ascending, then by name', () => {
    const sorted = [
      entry({ name: 'Brasier', level: '3' }),
      entry({ name: 'Zéphyr', level: '1' }),
      entry({ name: 'Aura', level: '1' }),
    ].sort(compareSpellEntries);
    expect(names(sorted)).toEqual(['aura', 'zéphyr', 'brasier']);
  });

  it('compares names with French collation, accents included', () => {
    const sorted = [entry({ name: 'Zéphyr' }), entry({ name: 'Éclair' })].sort(compareSpellEntries);
    expect(names(sorted)).toEqual(['éclair', 'zéphyr']);
  });

  it('puts a spell with no niveau last, not first', () => {
    const sorted = [entry({ name: 'Sans', level: '' }), entry({ name: 'Avec', level: '2' })].sort(
      compareSpellEntries,
    );
    expect(names(sorted)).toEqual(['avec', 'sans']);
  });
});

describe('activeFilterCount', () => {
  it('is zero with no filters', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });

  it('ignores a whitespace-only query', () => {
    expect(activeFilterCount(criteria({ query: '  ' }))).toBe(0);
  });

  it('counts every axis, one per selected tag', () => {
    expect(activeFilterCount(criteria({ query: 'feu', level: '1', tags: ['healing', 'ally'] }))).toBe(
      4,
    );
  });
});

describe('matchesCriteria', () => {
  it('matches a name substring', () => {
    expect(matchesCriteria(entry({ name: 'Mur de flammes' }), criteria({ query: 'flam' }))).toBe(
      true,
    );
    expect(matchesCriteria(entry({ name: 'Mur de flammes' }), criteria({ query: 'glace' }))).toBe(
      false,
    );
  });

  it('ORs tags inside one axis', () => {
    const c = criteria({ tags: ['ally', 'enemy'] });
    expect(matchesCriteria(entry({ tags: ['ally'] }), c)).toBe(true);
    expect(matchesCriteria(entry({ tags: ['enemy'] }), c)).toBe(true);
    expect(matchesCriteria(entry({ tags: ['self'] }), c)).toBe(false);
  });

  it('ANDs tags across axes', () => {
    const c = criteria({ tags: ['healing', 'ally'] });
    expect(matchesCriteria(entry({ tags: ['healing', 'ally'] }), c)).toBe(true);
    expect(matchesCriteria(entry({ tags: ['healing'] }), c)).toBe(false);
  });
});

describe('buildSpellSections', () => {
  const entries = [
    entry({ name: 'Aura', sphere: 'sphereFeu', level: '1' }),
    entry({ name: 'Brasier', sphere: 'sphereFeu', level: '2' }),
    entry({ name: 'Vague', sphere: 'sphereEau', level: '1' }),
    entry({ name: 'Épée ardente', sphere: 'sphereFeu', level: '1' }),
  ];

  it('groups by sphère in the catalogue order and keeps the entries order', () => {
    const sections = buildSpellSections(entries, SPHERES, NO_FILTERS, NONE);
    expect(sections.map((s) => s.key)).toEqual(['sphereFeu', 'sphereEau']);
    expect(names(sections[0].data)).toEqual(['aura', 'brasier', 'épée ardente']);
  });

  it('normalizes the raw query, so an unaccented search finds an accented name', () => {
    const sections = buildSpellSections(entries, SPHERES, criteria({ query: ' Epee ' }), NONE);
    expect(names(sections.flatMap((s) => s.data))).toEqual(['épée ardente']);
  });

  it('matches whatever the case the player typed', () => {
    const sections = buildSpellSections(entries, SPHERES, criteria({ query: 'BRAS' }), NONE);
    expect(names(sections.flatMap((s) => s.data))).toEqual(['brasier']);
  });

  it('keeps a collapsed section, with its count and no rows', () => {
    const sections = buildSpellSections(entries, SPHERES, NO_FILTERS, new Set(['sphereFeu']));
    expect(sections[0]).toMatchObject({ key: 'sphereFeu', count: 3 });
    expect(sections[0].data).toEqual([]);
    expect(sections[1].data).toHaveLength(1);
  });

  it('still reports the match count of a sphère collapsed while filtering', () => {
    const sections = buildSpellSections(
      entries,
      SPHERES,
      criteria({ query: 'a' }),
      new Set(['sphereFeu']),
    );
    expect(sections[0]).toMatchObject({ key: 'sphereFeu', count: 3 });
    expect(sections[0].data).toEqual([]);
  });

  it('drops a sphère with no match, collapsed or not', () => {
    const sections = buildSpellSections(
      entries,
      SPHERES,
      criteria({ query: 'vague' }),
      new Set(['sphereFeu', 'sphereEau']),
    );
    expect(sections.map((s) => s.key)).toEqual(['sphereEau']);
  });

  it('restricts to one sphère through the facet', () => {
    const sections = buildSpellSections(entries, SPHERES, criteria({ sphere: 'sphereEau' }), NONE);
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe('sphereEau');
  });
});
