// How the manœuvres catalogue is narrowed and laid out: search index, then one
// grouping pass into contexte → rubrique → rows. The weapons' treatment
// (`weapon-grouping`), for the same reason: the arithmetic of a keystroke
// belongs where plain-Node vitest can reach it.
//
// Pure — no framework imports, like the other engines in lib/.

import {
  MANOEUVRE_CONTEXTS,
  MANOEUVRE_FAMILIES,
  type ManoeuvreContext,
  type ManoeuvreFamily,
} from '@/constants/prophecy';
import type { ManoeuvrePreset } from '@/data/manoeuvre-catalog';
import { fold } from '@/lib/text-fold';

export interface IndexedManoeuvre {
  preset: ManoeuvrePreset;
  /** Name, effet en jeu and rulebook paragraph, folded once. */
  search: string;
}

export interface ManoeuvreGroup {
  contexte: ManoeuvreContext;
  families: { famille: ManoeuvreFamily; items: ManoeuvrePreset[] }[];
  count: number;
}

/**
 * Fold every entry once — per catalogue change, not per keystroke. The text is
 * searched as well as the name: « sable » should find « Attaques déroutantes »,
 * the same reach the avantages' search has.
 */
export function buildManoeuvreIndex(presets: readonly ManoeuvrePreset[]): IndexedManoeuvre[] {
  return presets.map((preset) => ({
    preset,
    search: fold([preset.nom, preset.inGameEffect ?? '', preset.description].join('\n')),
  }));
}

/**
 * Narrow by `query` (already folded — see `foldQuery`) and group in ONE pass.
 * Contextes and rubriques come out in the taxonomy's order; within a rubrique
 * the index's order stands (the rulebook's, house entries after). An empty
 * group is dropped rather than emitted — it would be a bare header.
 */
export function groupManoeuvres(
  index: readonly IndexedManoeuvre[],
  query: string,
): { groups: ManoeuvreGroup[]; total: number } {
  const buckets = new Map<string, ManoeuvrePreset[]>();
  let total = 0;
  for (const { preset, search } of index) {
    if (query !== '' && !search.includes(query)) continue;
    total++;
    const key = `${preset.contexte}/${preset.famille}`;
    const items = buckets.get(key);
    if (items) items.push(preset);
    else buckets.set(key, [preset]);
  }

  const groups: ManoeuvreGroup[] = [];
  for (const { key: contexte } of MANOEUVRE_CONTEXTS) {
    const families = MANOEUVRE_FAMILIES.flatMap(({ key: famille }) => {
      const items = buckets.get(`${contexte}/${famille}`);
      return items ? [{ famille, items }] : [];
    });
    if (families.length > 0) {
      groups.push({ contexte, families, count: families.reduce((n, f) => n + f.items.length, 0) });
    }
  }
  return { groups, total };
}
