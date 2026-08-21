// Sectioning, sorting and filtering for the spell catalogue picker. Pure — the
// screen owns the state and the pixels, this owns the decisions, so « does a
// collapsed sphère still show its count » is a unit test rather than a
// screenshot.

import { SPELL_TAG_GROUP } from '@/constants/prophecy';
import { foldQuery } from '@/lib/text-fold';

/** The catalogue facets, `''` / `[]` meaning "no filter on this axis". */
export interface SpellFilterCriteria {
  /** Free text exactly as typed — {@link buildSpellSections} normalizes it. */
  query: string;
  sphere: string;
  discipline: string;
  level: string;
  tags: readonly string[];
}

export const NO_FILTERS: SpellFilterCriteria = {
  query: '',
  sphere: '',
  discipline: '',
  level: '',
  tags: [],
};

/**
 * The precomputed shape the screen indexes a preset into. Deliberately not the
 * preset itself: everything here is derived once at module load (lowercasing
 * 300+ names on every keystroke is garbage) and the sort/filter never needs
 * more.
 */
export interface SpellCatalogEntry {
  /** The name through {@link foldQuery} — what `query` matches. */
  search: string;
  /** Lowercased name, accents kept — the sort tiebreak. */
  sortKey: string;
  discipline: string;
  sphere: string;
  /** Niveau as written in the CSV, `''` when the preset has none. */
  level: string;
  tags: readonly string[];
}

export interface SpellSection<T> {
  key: string;
  title: string;
  /** Matches in this sphère — reported even while collapsed, which is the point. */
  count: number;
  /** Empty while collapsed; `count` is what the header shows. */
  data: T[];
}

/**
 * How many facets are narrowing the list. Drives the « Filtres (2) » badge and,
 * through {@link hasActiveFilters}, whether the sections may collapse at all:
 * a search that found 3 spells must not hide them behind a folded header.
 */
export function activeFilterCount(c: SpellFilterCriteria): number {
  return (
    (foldQuery(c.query) === '' ? 0 : 1) +
    (c.sphere === '' ? 0 : 1) +
    (c.discipline === '' ? 0 : 1) +
    (c.level === '' ? 0 : 1) +
    c.tags.length
  );
}

export function hasActiveFilters(c: SpellFilterCriteria): boolean {
  return activeFilterCount(c) > 0;
}

/**
 * Niveau ascending, then name A→Z. A spell with no niveau sorts LAST rather
 * than first: an empty cell is missing data, not « niveau 0 ».
 */
export function compareSpellEntries(a: SpellCatalogEntry, b: SpellCatalogEntry): number {
  const la = a.level === '' ? Infinity : Number(a.level);
  const lb = b.level === '' ? Infinity : Number(b.level);
  if (la !== lb) return la - lb;
  // `sortKey`, not `search`: the accents are gone from the latter, and French
  // collation is the whole reason « Éclair » belongs next to « Echo ».
  return a.sortKey.localeCompare(b.sortKey, 'fr');
}

/**
 * Tags narrow **OR within an axis, AND across axes** — the usual facet
 * semantic, and the only one that behaves: « Allié » + « Ennemi » picked
 * together means "either target", while « Soin » + « Allié » means both.
 * A tag whose group is unknown is treated as its own axis.
 */
function matchesTags(entryTags: readonly string[], selected: readonly string[]): boolean {
  if (selected.length === 0) return true;
  const has = new Set(entryTags);
  const byGroup = new Map<string, string[]>();
  for (const t of selected) {
    const g = SPELL_TAG_GROUP[t] ?? t;
    const list = byGroup.get(g);
    if (list) list.push(t);
    else byGroup.set(g, [t]);
  }
  for (const group of byGroup.values()) {
    if (!group.some((t) => has.has(t))) return false;
  }
  return true;
}

/**
 * `c.query` must ALREADY be normalized — {@link buildSpellSections} does it once
 * per pass rather than once per spell, which at 300+ entries per keystroke is
 * the difference that matters.
 */
export function matchesCriteria(e: SpellCatalogEntry, c: SpellFilterCriteria): boolean {
  return (
    (c.query === '' || e.search.includes(c.query)) &&
    (c.discipline === '' || e.discipline === c.discipline) &&
    (c.level === '' || e.level === c.level) &&
    matchesTags(e.tags, c.tags)
  );
}

/**
 * Group the catalogue into one section per sphère, in the `spheres` order.
 *
 * `entries` is expected pre-sorted (see {@link compareSpellEntries}) — the
 * order is a property of the index, not of a keystroke.
 *
 * A **collapsed** sphère keeps its section with `data: []`, so its header (and
 * its count) stays on screen and can be unfolded. A sphère with no match is
 * dropped entirely, collapsed or not: an empty header is noise.
 */
export function buildSpellSections<T extends SpellCatalogEntry>(
  entries: readonly T[],
  spheres: readonly { key: string; label: string }[],
  criteria: SpellFilterCriteria,
  collapsed: ReadonlySet<string>,
): SpellSection<T>[] {
  const applied = { ...criteria, query: foldQuery(criteria.query) };

  // ONE pass over the catalogue, bucketed by sphère — testing every entry once
  // per sphère instead meant 9 × 300 predicate calls on every keystroke. The
  // buckets inherit the entries' order, which is the sort.
  const buckets = new Map<string, T[]>();
  for (const e of entries) {
    if (applied.sphere !== '' && e.sphere !== applied.sphere) continue;
    if (!matchesCriteria(e, applied)) continue;
    const bucket = buckets.get(e.sphere);
    if (bucket) bucket.push(e);
    else buckets.set(e.sphere, [e]);
  }

  const sections: SpellSection<T>[] = [];
  for (const s of spheres) {
    const rows = buckets.get(s.key);
    if (!rows) continue;
    sections.push({
      key: s.key,
      title: s.label,
      count: rows.length,
      data: collapsed.has(s.key) ? [] : rows,
    });
  }
  return sections;
}
