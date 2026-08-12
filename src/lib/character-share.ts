// Campaign sharing: the filtered, read-only view of a character that a player
// opts to share into a campaign for the Game Master to see. This is the wire
// contract between the app and the (self-hostable) campaign server.
//
// This module is PURE — no DB, no network. The sync layer builds a
// `SharedCharacter` from the live `characters` + `actual_state` rows (reactively,
// on change) and publishes it; the server stores only the latest one per
// character and relays it to the GM. Keeping the projection pure makes the
// exact shared-field set unit-testable in plain Node.
//
// DATA MINIMISATION (privacy — this is deliberate, not an oversight):
// only combat state + core stats + the tactical bits below are shared.
// Shared on top of the core stats (v2):
//   - `skills`  — the TRAINED skills only (value > 0), with their linked attribut
//     and specialization link, so the GM can read/compute a skill roll.
//   - `effects` — the ACTIVE (non-expired) temporary bonuses/maluses currently
//     modifying the character's rolls.
// Excluded on purpose —
//   - identity/backstory: `concept`, `biographie`  (narrative, GM doesn't need)
//   - `notes`                                       (the player's private text)
//   - money (`drac*`)                               (not tactical)
//   - magic (spheres / disciplines / reserve)       (GM-view default is off)
//   - untrained skills (value 0) and expired effects (not in play)
// `nom` IS included: it is the roster label (the identifier), not backstory —
// a roster of unnamed characters is useless.
//
// The GM's own private notes are NOT part of this: they live only on the GM's
// device and never travel over the wire (see [[prophecy-campaign-architecture]]).

import { z } from 'zod';

import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  RESOURCES,
  TENDANCES,
  WOUND_LEVELS,
} from '@/constants/prophecy';
import type { ActualState, Character, Effect, Skill } from '@/db/schema';
import { asNumRecord } from '@/lib/character-values';
import { initiativeDiceCount } from '@/lib/dice';

/** Bumped on any breaking change to the SharedCharacter shape. v2: skills + effects. */
export const SHARED_SCHEMA_VERSION = 2;

// Column-key groups, derived from the domain constants so this stays in sync
// with the schema instead of re-listing columns by hand.
const CARAC_KEYS: readonly string[] = CARACTERISTIQUES.map((c) => c.key);
const ATTR_KEYS: readonly string[] = ATTRIBUTS.map((a) => a.key);
// Tendances carry a main number + a 0–10 subnumber each.
const TENDANCE_KEYS: readonly string[] = TENDANCES.flatMap((t) => [t.key, `${t.key}Sub`]);

const int = z.number().int();
const numRecord = (keys: readonly string[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, int])));
// A pool shown as "current / max" — max lives on the sheet, current on actual_state.
const currentMax = z.object({ current: int, max: int });
const cmRecord = (keys: readonly string[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, currentMax])));

// A trained skill as the GM sees it: its total value, the attribut it rolls off,
// and its specialization link (null on a base skill).
const sharedSkillSchema = z.object({
  name: z.string(),
  attribut: z.string(),
  value: int,
  parentName: z.string().nullable(),
  specLabel: z.string().nullable(),
});

// An active temporary bonus/malus. `target` is a stat key, `'all'`, or the
// `skill:<name>` form (see lib/modifiers) — kept opaque here.
const sharedEffectSchema = z.object({
  label: z.string(),
  target: z.string(),
  value: int,
  durationUnit: z.string(),
  durationRemaining: int,
});

export const sharedCharacterSchema = z.object({
  nom: z.string(),
  caracteristiques: numRecord(CARAC_KEYS),
  attributs: numRecord(ATTR_KEYS),
  tendances: numRecord(TENDANCE_KEYS),
  wounds: cmRecord(WOUND_LEVELS.map((w) => w.key)),
  resources: cmRecord(RESOURCES.map((r) => r.key)),
  initiative: z.object({ max: int, values: z.array(int) }),
  conditions: z.string(),
  skills: z.array(sharedSkillSchema),
  effects: z.array(sharedEffectSchema),
});

export type SharedCharacter = z.infer<typeof sharedCharacterSchema>;

/**
 * Project a character's live rows into the shared view sent to the GM.
 *
 * Reads numerics generically via `asNumRecord` (the one place for the unsafe
 * cast). Every field defaults to 0 / '' / [] so a partial or freshly-created
 * row never throws — the projection is always well-formed.
 *
 * `skillRows`/`effectRows` are the character's child rows; they default to `[]`
 * so a caller that has none (or a test) still gets a well-formed projection.
 * Only TRAINED skills (value > 0) and ACTIVE (non-expired) effects cross the wire.
 */
export function toSharedCharacter(
  character: Character,
  state: ActualState,
  skillRows: Skill[] = [],
  effectRows: Effect[] = [],
): SharedCharacter {
  const c = asNumRecord(character);
  const s = asNumRecord(state);
  const pick = (keys: readonly string[]): Record<string, number> =>
    Object.fromEntries(keys.map((k) => [k, c[k] ?? 0]));

  return {
    nom: character.nom ?? '',
    caracteristiques: pick(CARAC_KEYS),
    attributs: pick(ATTR_KEYS),
    tendances: pick(TENDANCE_KEYS),
    wounds: Object.fromEntries(
      WOUND_LEVELS.map((w) => [
        w.key,
        { current: s[`${w.key}Current`] ?? 0, max: c[`${w.key}Max`] ?? 0 },
      ]),
    ),
    resources: Object.fromEntries(
      RESOURCES.map((r) => [
        r.key,
        { current: s[`${r.key}Current`] ?? 0, max: c[`${r.key}Max`] ?? 0 },
      ]),
    ),
    initiative: {
      // The EFFECTIVE dice count (sheet max + temporary dice), not the sheet
      // number: to the GM a die is a die, and shipping the bonus separately
      // would widen the wire for no tactical gain. No schema bump — the field
      // keeps its shape and meaning ("how many dice this character rolls").
      max: initiativeDiceCount(c.initiativeMax ?? 0, s.initiativeBonusDice ?? 0),
      values: Array.isArray(state.initiativeValues) ? state.initiativeValues : [],
    },
    conditions: state.conditions ?? '',
    skills: skillRows
      .filter((sk) => (sk.value ?? 0) > 0)
      .map((sk) => ({
        name: sk.name ?? '',
        attribut: sk.attribut ?? '',
        value: sk.value ?? 0,
        parentName: sk.parentName ?? null,
        specLabel: sk.specLabel ?? null,
      })),
    effects: effectRows
      .filter((e) => !e.expired)
      .map((e) => ({
        label: e.label ?? '',
        target: e.target ?? 'all',
        value: e.value ?? 0,
        durationUnit: e.durationUnit ?? 'round',
        durationRemaining: e.durationRemaining ?? 0,
      })),
  };
}
