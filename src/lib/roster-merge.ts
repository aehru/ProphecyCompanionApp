// The table roster is LOCAL-FIRST: a GM's own NPCs are projected straight from
// this device's DB and exist with no server at all; the relay only adds the
// players' characters on top.
//
// This module is PURE (no DB, no network) so the merge rule is unit-testable:
// for a given charId the LOCAL entry always wins. That matters when
// `campaigns.shareNpcs` is on — the GM's NPCs then also come back down the
// socket, a debounce behind the local rows, and echoing a stale projection over
// the live one would make wounds "jump back" mid-fight.

import type { RosterEntry } from '@/lib/campaign-protocol';

/** Where a roster entry came from — local DB row vs relay server. */
export type RosterSource = 'local' | 'remote';

export interface TableRosterEntry extends RosterEntry {
  source: RosterSource;
}

const byName = (a: TableRosterEntry, b: TableRosterEntry) => {
  const cmp = String(a.character.nom ?? '').localeCompare(String(b.character.nom ?? ''));
  // Same name (three "Garde 2" is a real case) — fall back to the id so the
  // order is stable across renders instead of depending on input order.
  return cmp !== 0 ? cmp : a.charId.localeCompare(b.charId);
};

/**
 * Merge the local projections with what the server sent, name-sorted.
 * Duplicates (same `charId`) collapse onto the local entry.
 */
export function mergeRoster(
  local: readonly RosterEntry[],
  remote: readonly RosterEntry[],
): TableRosterEntry[] {
  const seen = new Set(local.map((e) => e.charId));
  const merged: TableRosterEntry[] = local.map((e) => ({ ...e, source: 'local' as const }));
  for (const entry of remote) {
    if (seen.has(entry.charId)) continue;
    seen.add(entry.charId);
    merged.push({ ...entry, source: 'remote' });
  }
  return merged.sort(byName);
}
