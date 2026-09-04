// How the avantages / désavantages catalogue is narrowed and laid out: search
// index, then one grouping pass into rareté → rows.
//
// Out of the component for the reason `weapon-grouping` is: this is the
// arithmetic of a keystroke, and it belongs where plain-Node vitest can reach
// it. The component keeps what is actually about the UI — which glyph a section
// gets, what a row renders.
//
// The shape it replaces folded every entry's NAME **and its whole rulebook
// paragraph** on every keystroke — ~31 000 characters of NFD normalization once
// the catalogue is fully typed — and then walked the result once per rareté (up
// to four passes) on every render. Both are now paid once, at module load.
//
// Searching the description is worth keeping: an entry is as often looked up by
// what it does (« phobie », « boiteux ») as by its exact title. It is the
// re-folding that was the waste, not the reach.
//
// Pure — no framework imports, like the other engines in lib/.

import { TRAIT_KIND_RARITIES, type TraitKind, type TraitRarity } from '@/constants/prophecy';
import { fold } from '@/lib/text-fold';
import { traitCostLabel } from '@/lib/trait-pool';

/** The minimum a preset must carry to be grouped — the catalogue's own shape. */
export interface GroupableTrait {
  id: string;
  costs: readonly number[];
  data: {
    kind: TraitKind;
    rarity?: TraitRarity | null;
    name?: string | null;
    description?: string | null;
    inGameEffect?: string | null;
  };
}

/**
 * A preset with everything a keystroke or a row would otherwise re-derive: the
 * folded haystack, the price as it reads, and the row's whole subtitle.
 */
export interface IndexedTrait<P extends GroupableTrait> {
  preset: P;
  /** Folded name + description, joined — one string to search instead of two. */
  search: string;
  rarity: TraitRarity;
  /** « 2 points » / « 1, 2 ou 3 points ». */
  costLabel: string;
  /** The catalogue row's second line: the price, then the mechanical summary. */
  subtitle: string;
}

export interface RarityGroup<P extends GroupableTrait> {
  rarity: TraitRarity;
  /** Matches under this heading — reported even while collapsed, which is the point. */
  count: number;
  /** Empty while collapsed; `count` is what the header shows. */
  items: IndexedTrait<P>[];
}

/**
 * What is narrowing the list. `kind` is the half being browsed rather than a
 * facet — there is always one — while `query` and `rarity` are the filters
 * proper, `''` meaning "no filter on this axis".
 */
export interface TraitFilterCriteria {
  kind: TraitKind;
  /** ALREADY folded — see `foldQuery`. Folding once per pass, not per entry. */
  query: string;
  rarity: string;
}

/** Whether anything is narrowing the list — see the collapse rule in `groupTraits`. */
export function hasTraitFilters(c: TraitFilterCriteria): boolean {
  return c.query !== '' || c.rarity !== '';
}

export interface TraitGrouping<P extends GroupableTrait> {
  groups: RarityGroup<P>[];
  /** How many entries matched, across every group. */
  total: number;
  /**
   * How many entries this kind holds at all, query ignored.
   *
   * Zero and `total` zero are two different things and the screen must not
   * confuse them: « Aucune entrée ne correspond » on a half of the catalogue
   * that has simply not been typed yet tells the player their SEARCH failed,
   * and they retype it.
   */
  kindTotal: number;
}

/** Fold and pre-render every entry once. Call at module load — it is static. */
export function buildTraitIndex<P extends GroupableTrait>(presets: readonly P[]): IndexedTrait<P>[] {
  return presets.map((preset) => {
    const costLabel = traitCostLabel(preset.costs);
    const summary = (preset.data.inGameEffect ?? '').trim();
    return {
      preset,
      search: fold(`${preset.data.name ?? ''} ${preset.data.description ?? ''}`),
      rarity: preset.data.rarity ?? 'commun',
      costLabel,
      subtitle: summary === '' ? costLabel : `${costLabel} · ${summary}`,
    };
  });
}

/**
 * Narrow to one kind, then to the query and the rareté, and group in ONE pass.
 *
 * An empty query matches everything, so the catalogue can be browsed whole.
 * Groups come out in the RULEBOOK's order of headings (`TRAIT_KIND_RARITIES`),
 * not in the order rows happened to be bucketed, and an empty heading is
 * dropped rather than rendered as a bare title.
 *
 * A **collapsed** rareté keeps its group with `items: []`, so its header and its
 * count stay on screen and can be unfolded — a fold hides rows, never the fact
 * that they exist. The one exception, and it is the same rule the spell
 * catalogue follows: while a filter is active, NOTHING is collapsed. A search
 * that found three entries must not hide them behind a folded header the player
 * closed ten minutes ago.
 */
export function groupTraits<P extends GroupableTrait>(
  index: readonly IndexedTrait<P>[],
  criteria: TraitFilterCriteria,
  collapsed: ReadonlySet<string> = EMPTY_SET,
): TraitGrouping<P> {
  const { kind, query, rarity } = criteria;
  const folds = hasTraitFilters(criteria) ? EMPTY_SET : collapsed;

  const buckets = new Map<TraitRarity, IndexedTrait<P>[]>();
  let total = 0;
  let kindTotal = 0;

  for (const entry of index) {
    if (entry.preset.data.kind !== kind) continue;
    kindTotal++;
    if (rarity !== '' && entry.rarity !== rarity) continue;
    if (query !== '' && !entry.search.includes(query)) continue;
    total++;
    const bucket = buckets.get(entry.rarity);
    if (bucket) bucket.push(entry);
    else buckets.set(entry.rarity, [entry]);
  }

  const groups: RarityGroup<P>[] = [];
  const push = (r: TraitRarity, items: IndexedTrait<P>[]) =>
    groups.push({ rarity: r, count: items.length, items: folds.has(r) ? [] : items });

  for (const r of TRAIT_KIND_RARITIES[kind]) {
    const items = buckets.get(r);
    if (items) push(r, items);
  }
  // A rarity the kind is not supposed to have (an entry from a later rulebook,
  // or a hand-edited CSV) still gets a heading rather than vanishing from a
  // list that claims to be the catalogue.
  for (const [r, items] of buckets) {
    if (!TRAIT_KIND_RARITIES[kind].includes(r)) push(r, items);
  }

  return { groups, total, kindTotal };
}

/** Module-level: a fresh Set per call would be a new prop on every render. */
const EMPTY_SET: ReadonlySet<string> = new Set();
