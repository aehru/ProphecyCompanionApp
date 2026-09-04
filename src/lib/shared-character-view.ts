// Reading a projection defensively, for the GM's views.
//
// A `SharedCharacter` arrives from the wire through a tolerant parser (see
// campaign-protocol.ts) and is therefore typed as opaque JSON: every screen that
// displays one needs the same handful of casts. They live here rather than being
// re-declared per screen, so widening the projection is a one-file change.

import { sharedWoundMalus } from '@/lib/initiative-order';
import type { SharedSkill } from '@/lib/skill-groups';

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

/**
 * The fallbacks are SHARED and frozen, never fresh literals.
 *
 * Every reader of a projection is a React component, and half of them feed what
 * they read to a `useMemo` — `groupSkills(skills, attr, …)` above all. A `{}`
 * or `[]` built per call is a new reference on every render, so a projection
 * that simply omits a field (all of them are optional on the wire) would defeat
 * the memo it lands in and re-group every card's skills on every keystroke. A
 * present field is already reference-stable: these accessors are casts, not
 * copies.
 */
const EMPTY_NUMS: NumRecord = Object.freeze({});
const EMPTY_POOLS: PoolRecord = Object.freeze({});
const EMPTY_EFFECTS = Object.freeze([]) as readonly SharedEffectView[] as SharedEffectView[];
const EMPTY_SKILLS = Object.freeze([]) as readonly SharedSkill[] as SharedSkill[];

/** A record of plain numbers (caractéristiques, attributs, tendances). */
export const nums = (v: unknown): NumRecord => (v ?? EMPTY_NUMS) as NumRecord;

/** A record of current/max pools (wounds, resources). */
export const pools = (v: unknown): PoolRecord => (v ?? EMPTY_POOLS) as PoolRecord;

/**
 * The active effects a projection carries. An ARRAY in every case: the field is
 * optional on the wire, and three readers had each written the same
 * `Array.isArray(...) ? ... : []` before this lived here.
 */
export const effectsOf = (v: unknown): SharedEffectView[] =>
  Array.isArray(v) ? (v as SharedEffectView[]) : EMPTY_EFFECTS;

/**
 * The wound malus a projection's boxes imply — the single worst filled level,
 * the same reading the turn order and the player's own sheet use. Takes the raw
 * field so a caller never has to remember it goes through `pools` first.
 */
export const woundOf = (wounds: unknown): number => sharedWoundMalus(pools(wounds));

/** The trained skills a projection carries — untrained ones never travel. */
export const skillsOf = (v: unknown): SharedSkill[] =>
  Array.isArray(v) ? (v as SharedSkill[]) : EMPTY_SKILLS;
