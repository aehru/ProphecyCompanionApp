// Rolling a roster character — the GM's side of lib/roll-context.
//
// A projection is all the GM holds for a PLAYER's character, and it is not the
// shape the Fiche reads: caractéristiques, attributs, wounds and effects arrive
// as opaque JSON off the wire (see shared-character-view). It nevertheless
// carries everything a stat roll needs, so the roll a GM makes from the roster
// is arithmetically the same one the player would make from their own sheet —
// which is the point: the two must not drift.
//
// PURE (no React, no DB), like the rest of lib/.

import type { RollContext } from '@/lib/roll';
import { STAT_LABELS, statRollContext } from '@/lib/roll-context';
import { effectsOf, nums, woundOf } from '@/lib/shared-character-view';

/** The bits of a projection a roll reads. Everything else is somebody's view. */
export interface RollableProjection {
  caracteristiques?: unknown;
  attributs?: unknown;
  wounds?: unknown;
  effects?: unknown;
}

/**
 * Roll one attribut or caractéristique off a projection.
 *
 * The wound malus comes from the wound BOXES rather than a stored total — the
 * projection carries the pools, and `woundOf` is the same reading the turn order
 * and the sheet's own tiles use.
 */
export function sharedStatRollContext(
  character: RollableProjection,
  key: string,
  kind: 'attribut' | 'caracteristique',
): RollContext {
  const stat = STAT_LABELS[key];
  const values = nums(kind === 'attribut' ? character.attributs : character.caracteristiques);
  return statRollContext({
    key,
    label: stat?.label ?? key,
    abbr: stat?.abbr,
    value: values[key] ?? 0,
    kind,
    effects: effectsOf(character.effects),
    wound: woundOf(character.wounds),
  });
}
