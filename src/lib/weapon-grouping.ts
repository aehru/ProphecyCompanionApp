// How the weapon catalogue is narrowed and laid out: search index, then one
// grouping pass into catégorie → maniement → rows.
//
// Out of the component for the reason `skill-groups` and `skill-grouping` are:
// this is the arithmetic of a keystroke, and it belongs where plain-Node vitest
// can reach it. The component keeps the parts that are actually about the UI —
// which glyph a catégorie gets, what a row renders.
//
// The shape it replaces walked the catalogue `catégories × maniements` times
// (20 passes over 77 presets) on every render, search box included, and folded
// all 77 names again per keystroke. Both are now paid once.
//
// Pure — no framework imports, like the other engines in lib/.

import { WEAPON_CATEGORIES, WEAPON_HANDS, type WeaponCategory, type WeaponHands } from '@/data/weapon-constants';
import { fold } from '@/lib/text-fold';

/** The minimum a preset must carry to be grouped — the catalogue's own shape. */
export interface GroupablePreset {
  category: WeaponCategory;
  hands: WeaponHands;
  data: { name?: string | null };
}

/** A preset with its folded name, so a search never folds the same string twice. */
export interface IndexedPreset<P extends GroupablePreset> {
  preset: P;
  search: string;
}

export interface HandGroup<P extends GroupablePreset> {
  hand: WeaponHands;
  items: P[];
}

export interface CategoryGroup<P extends GroupablePreset> {
  category: WeaponCategory;
  hands: HandGroup<P>[];
}

export interface WeaponGrouping<P extends GroupablePreset> {
  groups: CategoryGroup<P>[];
  /** How many presets matched, across every group. */
  total: number;
}

/**
 * Fold every name once. Call at module load: the catalogue is static, and
 * re-deriving this per render is the cost the whole module exists to remove.
 */
export function buildWeaponIndex<P extends GroupablePreset>(presets: readonly P[]): IndexedPreset<P>[] {
  return presets.map((preset) => ({ preset, search: fold(preset.data.name ?? '') }));
}

/**
 * Narrow by `query` (already folded — see `foldQuery`) and group in ONE pass.
 *
 * An empty query matches everything, so the catalogue can be browsed whole.
 * Groups come out in the TAXONOMY's order, not in the order rows happened to be
 * bucketed: which catégorie comes first is a property of the rulebook, and the
 * order must not shift as a search narrows the list.
 *
 * A catégorie or a maniement with no match is dropped rather than emitted
 * empty — the caller renders a section per group and an empty one would be a
 * bare header.
 */
export function groupWeapons<P extends GroupablePreset>(
  index: readonly IndexedPreset<P>[],
  query: string,
): WeaponGrouping<P> {
  const buckets = new Map<WeaponCategory, Map<WeaponHands, P[]>>();
  let total = 0;
  for (const entry of index) {
    if (query !== '' && !entry.search.includes(query)) continue;
    total++;
    let byHand = buckets.get(entry.preset.category);
    if (!byHand) buckets.set(entry.preset.category, (byHand = new Map()));
    const items = byHand.get(entry.preset.hands);
    if (items) items.push(entry.preset);
    else byHand.set(entry.preset.hands, [entry.preset]);
  }

  const groups: CategoryGroup<P>[] = [];
  for (const category of WEAPON_CATEGORIES) {
    const byHand = buckets.get(category);
    if (!byHand) continue;
    const hands = WEAPON_HANDS.flatMap((hand) => {
      const items = byHand.get(hand);
      return items ? [{ hand, items }] : [];
    });
    if (hands.length > 0) groups.push({ category, hands });
  }
  return { groups, total };
}
