// Reading a projection defensively, for the GM's views.
//
// A `SharedCharacter` arrives from the wire through a tolerant parser (see
// campaign-protocol.ts) and is therefore typed as opaque JSON: every screen that
// displays one needs the same handful of casts. They live here rather than being
// re-declared per screen, so widening the projection is a one-file change.

export type NumRecord = Record<string, number>;
export type PoolRecord = Record<string, { current?: number; max?: number }>;

/** An active bonus/malus as it appears in a projection. */
export interface SharedEffectView {
  label?: string;
  target?: string;
  value?: number;
  durationUnit?: string;
  durationRemaining?: number;
}

/** A record of plain numbers (caractéristiques, attributs, tendances). */
export const nums = (v: unknown): NumRecord => (v ?? {}) as NumRecord;

/** A record of current/max pools (wounds, resources). */
export const pools = (v: unknown): PoolRecord => (v ?? {}) as PoolRecord;
