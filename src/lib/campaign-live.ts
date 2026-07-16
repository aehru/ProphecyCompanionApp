// Live-broadcast policy helpers (pure, unit-tested). The player-side sync pushes
// the whole SharedCharacter, but only a change to the IN-PLAY values should
// trigger a push. `inPlaySignature` reduces a projection to just those live
// values, so the sync layer can compare signatures and skip no-op / sheet-only
// changes.
//
// In-play = what shifts during a session: current wound boxes, current resource
// pools (maîtrise, chance), the tendances and their bullets (which move in play),
// conditions, and the current-turn initiative dice.
// NOT in-play (frozen at activation for now): caractéristiques, attributs, and
// all MAX values.

import { RESOURCES, TENDANCES, WOUND_LEVELS } from '@/constants/prophecy';
import type { SharedCharacter } from '@/lib/character-share';

/** Debounce between the last in-play change and the push to the server. */
export const LIVE_DEBOUNCE_MS = 5000;

/**
 * A stable string of only the in-play values. Two projections that differ just
 * in caractéristiques/attributs (or a wound/resource MAX) produce the SAME
 * signature — those are frozen at activation and don't push.
 */
export function inPlaySignature(shared: SharedCharacter): string {
  return JSON.stringify({
    w: WOUND_LEVELS.map((w) => shared.wounds[w.key]?.current ?? 0),
    r: RESOURCES.map((r) => shared.resources[r.key]?.current ?? 0),
    // Tendance main number + its 0–10 bullets, both mutable in play.
    t: TENDANCES.flatMap((t) => [shared.tendances[t.key] ?? 0, shared.tendances[`${t.key}Sub`] ?? 0]),
    c: shared.conditions,
    i: shared.initiative.values,
  });
}
