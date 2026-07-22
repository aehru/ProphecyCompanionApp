// Live-broadcast policy helpers (pure, unit-tested). The player-side sync pushes
// the whole SharedCharacter, but only a change to the IN-PLAY values should
// trigger a push. `inPlaySignature` reduces a projection to just those live
// values, so the sync layer can compare signatures and skip no-op / sheet-only
// changes.
//
// In-play = what shifts during a session: current wound boxes, current resource
// pools (maîtrise, chance), the tendances and their bullets (which move in play),
// conditions, the current-turn initiative dice, and the active bonus/malus
// effects (they come and go during a fight).
// NOT in-play (frozen at activation for now): caractéristiques, attributs, all
// MAX values, and the skills list (sheet data — a training change is rare and
// rides along on the next in-play push).

import { RESOURCES, TENDANCES, WOUND_LEVELS } from '@/constants/prophecy';
import type { SharedCharacter } from '@/lib/character-share';

/** Debounce between the last in-play change and the push to the server. */
export const LIVE_DEBOUNCE_MS = 5000;

/**
 * A stable string of only the in-play values. Two projections that differ just
 * in caractéristiques/attributs (or a wound/resource MAX) produce the SAME
 * signature — those are frozen at activation and don't push.
 */
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

export function inPlaySignature(shared: SharedCharacter): string {
  return JSON.stringify({
    w: WOUND_LEVELS.map((w) => shared.wounds[w.key]?.current ?? 0),
    r: RESOURCES.map((r) => shared.resources[r.key]?.current ?? 0),
    // Tendance main number + its 0–10 bullets, both mutable in play.
    t: TENDANCES.flatMap((t) => [shared.tendances[t.key] ?? 0, shared.tendances[`${t.key}Sub`] ?? 0]),
    c: shared.conditions,
    i: shared.initiative.values,
    // Active bonus/malus: a change (new, tick-down, or expiry-drop) is in-play.
    e: shared.effects.map((ef) => [ef.target, ef.value, ef.durationUnit, ef.durationRemaining]),
  });
}
