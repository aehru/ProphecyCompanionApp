// Live-broadcast policy helpers (pure, unit-tested). The sync pushes the whole
// SharedCharacter; `projectionSignature` lets the sync layer compare snapshots
// and skip no-op refetches (drizzle live queries re-fire on ANY write to a
// watched table, most of which don't touch the projection at all).
//
// ANY visible change pushes — in-play values (wounds, resources, tendances,
// conditions, initiative, active effects) AND sheet edits (caractéristiques,
// attributs, maxes, skills): a player finishing a character edit syncs to the
// GM within one debounce, no "edit finished" event needed. The 5s debounce
// absorbs typing bursts while the edit FAB is open.

import type { SharedCharacter } from '@/lib/character-share';

/** Debounce between the last projection change and the push to the server. */
export const LIVE_DEBOUNCE_MS = 5000;

/**
 * Set difference between two share lists (character uuids). The broadcaster
 * diffs the previous shared set against the current one on every change:
 * `removed` uuids get an immediate `unshare` on the live socket (the ghost-
 * roster fix), `added` ones simply start pushing.
 */
export function diffShares(
  prev: string[],
  next: string[],
): { added: string[]; removed: string[] } {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  return {
    added: next.filter((id) => !prevSet.has(id)),
    removed: prev.filter((id) => !nextSet.has(id)),
  };
}

/**
 * A stable string of the whole projection. `toSharedCharacter` builds its
 * object with a fixed key order, so identical projections stringify
 * identically — two snapshots differ iff something the GM can see changed.
 */
export function projectionSignature(shared: SharedCharacter): string {
  return JSON.stringify(shared);
}
