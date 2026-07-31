// Which skill rows the editor shows, and how specializations hang off them.
// Pure (no React, no DB) so the filtering rules — the fiddly part — are
// unit-testable.

import type { Skill } from '@/db/schema';
import type { SkillRow } from '@/lib/character-values';

/** A base row plus its index in the caller's array (edits are index-keyed). */
export interface IndexedRow {
  row: SkillRow;
  index: number;
}

/** Specializations of one mother the character does NOT have as a base row. */
export type OrphanGroup = [motherName: string, specs: Skill[]];

/** Specializations keyed by the name of the skill they specialize. */
export function groupSpecsByMother(specs: readonly Skill[]): Map<string, Skill[]> {
  const map = new Map<string, Skill[]>();
  for (const s of specs) {
    if (!s.parentName) continue;
    const list = map.get(s.parentName) ?? [];
    list.push(s);
    map.set(s.parentName, list);
  }
  return map;
}

/**
 * The base rows on screen: while searching, every attribut is in scope and the
 * query matches on name; otherwise it is the active attribut's tab.
 */
export function visibleRows(
  rows: readonly SkillRow[],
  { searching, query, activeAttr }: { searching: boolean; query: string; activeAttr: string },
): IndexedRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      searching ? row.name.toLowerCase().includes(query) : row.attribut === activeAttr,
    );
}

/**
 * Specializations whose mother isn't shown as a base row (mother not in the
 * catalogue and not owned — e.g. a removed custom skill). They are grouped
 * under a "non acquise" header so they stay visible and editable instead of
 * silently disappearing. A search matches either the mother's name or the
 * specialization's own.
 */
export function orphanGroups(
  rows: readonly SkillRow[],
  specs: readonly Skill[],
  { searching, query, activeAttr }: { searching: boolean; query: string; activeAttr: string },
): OrphanGroup[] {
  const covered = new Set(rows.map((r) => r.name));
  const byMother = new Map<string, Skill[]>();
  for (const s of specs) {
    if (!s.parentName || covered.has(s.parentName)) continue;
    const inScope = searching
      ? s.parentName.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
      : s.attribut === activeAttr;
    if (!inScope) continue;
    const list = byMother.get(s.parentName) ?? [];
    list.push(s);
    byMother.set(s.parentName, list);
  }
  return [...byMother.entries()];
}
