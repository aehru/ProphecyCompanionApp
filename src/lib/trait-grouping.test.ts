import { describe, expect, it } from 'vitest';

import { buildTraitIndex, groupTraits, type GroupableTrait } from '@/lib/trait-grouping';

const preset = (
  id: string,
  over: Partial<GroupableTrait['data']> & { costs?: number[] } = {},
): GroupableTrait => {
  const { costs = [2], ...data } = over;
  return {
    id,
    costs,
    data: { kind: 'desavantage', rarity: 'commun', name: id, description: '', ...data },
  };
};

describe('buildTraitIndex', () => {
  it('folds the name AND the description into one haystack', () => {
    const [entry] = buildTraitIndex([
      preset('anomalie', { name: 'Anomalie', description: 'Une tare de naissance : ALBINOS.' }),
    ]);
    // Accents and case are gone on both halves — a player types « albinos »
    // without reaching for the accented keyboard.
    expect(entry.search).toContain('anomalie');
    expect(entry.search).toContain('albinos');
  });

  it('renders the price and the row subtitle once, at build time', () => {
    const [single] = buildTraitIndex([preset('a', { costs: [2], inGameEffect: 'Malus de 3.' })]);
    expect(single.costLabel).toBe('2 points');
    expect(single.subtitle).toBe('2 points · Malus de 3.');

    // No summary yet — the subtitle is the price alone, with no dangling separator.
    const [bare] = buildTraitIndex([preset('b', { costs: [1] })]);
    expect(bare.subtitle).toBe('1 point');
  });

  it('defaults a rarity-less entry to commun rather than dropping it', () => {
    const [entry] = buildTraitIndex([preset('c', { rarity: null })]);
    expect(entry.rarity).toBe('commun');
  });
});

describe('groupTraits', () => {
  const index = buildTraitIndex([
    preset('phobie', { name: 'Phobie', rarity: 'commun' }),
    preset('dette', { name: 'Dette', rarity: 'commun', description: 'Redevable d’une faveur.' }),
    preset('ancien', { name: 'Sagesse', rarity: 'ancien' }),
    preset('fortune', { name: 'Fortune', kind: 'avantage', rarity: 'commun' }),
  ]);

  it('keeps only the browsed kind', () => {
    const { groups, total, kindTotal } = groupTraits(index, 'avantage', '');
    expect(total).toBe(1);
    expect(kindTotal).toBe(1);
    expect(groups.flatMap((g) => g.items.map((e) => e.preset.id))).toEqual(['fortune']);
  });

  it('groups in the rulebook’s order of headings, dropping the empty ones', () => {
    const { groups } = groupTraits(index, 'desavantage', '');
    // TRAIT_KIND_RARITIES order is commun, rare, enfant, ancien — « rare » and
    // « enfant » hold nothing here and get no bare heading.
    expect(groups.map((g) => g.rarity)).toEqual(['commun', 'ancien']);
    expect(groups[0].items.map((e) => e.preset.id)).toEqual(['phobie', 'dette']);
  });

  it('matches on the description as well as the name', () => {
    const { total, groups } = groupTraits(index, 'desavantage', 'faveur');
    expect(total).toBe(1);
    expect(groups[0].items[0].preset.id).toBe('dette');
  });

  it('separates “nothing matched” from “this half is not typed yet”', () => {
    // The distinction the empty state is built on: a search that found nothing
    // must not read the same as a catalogue half nobody has filled in.
    const empty = groupTraits(buildTraitIndex([]), 'avantage', '');
    expect(empty).toMatchObject({ total: 0, kindTotal: 0 });

    const noMatch = groupTraits(index, 'avantage', 'zzz');
    expect(noMatch).toMatchObject({ total: 0, kindTotal: 1 });
  });

  it('still shows an entry whose rarity does not belong to its kind', () => {
    // A rare avantage cannot come from the generator, but a later rulebook or a
    // hand-edited file could produce one — it gets a heading rather than
    // vanishing from a list that claims to be the whole catalogue.
    const odd = buildTraitIndex([preset('x', { kind: 'avantage', rarity: 'rare' })]);
    const { groups, total } = groupTraits(odd, 'avantage', '');
    expect(total).toBe(1);
    expect(groups.map((g) => g.rarity)).toEqual(['rare']);
  });
});
