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
// only combat state + core stats are shared. Excluded on purpose —
//   - identity/backstory: `concept`, `biographie`  (narrative, GM doesn't need)
//   - `notes`                                       (the player's private text)
//   - money (`drac*`)                               (not tactical)
//   - magic (spheres / disciplines / reserve)       (GM-view default is off)
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
import type { ActualState, Character } from '@/db/schema';
import { asNumRecord } from '@/lib/character-values';

/** Bumped on any breaking change to the SharedCharacter shape. */
export const SHARED_SCHEMA_VERSION = 1;

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

export const sharedCharacterSchema = z.object({
  nom: z.string(),
  caracteristiques: numRecord(CARAC_KEYS),
  attributs: numRecord(ATTR_KEYS),
  tendances: numRecord(TENDANCE_KEYS),
  wounds: cmRecord(WOUND_LEVELS.map((w) => w.key)),
  resources: cmRecord(RESOURCES.map((r) => r.key)),
  initiative: z.object({ max: int, values: z.array(int) }),
  conditions: z.string(),
});

export type SharedCharacter = z.infer<typeof sharedCharacterSchema>;

/**
 * Project a character's live rows into the shared view sent to the GM.
 *
 * Reads numerics generically via `asNumRecord` (the one place for the unsafe
 * cast). Every field defaults to 0 / '' / [] so a partial or freshly-created
 * row never throws — the projection is always well-formed.
 */
export function toSharedCharacter(character: Character, state: ActualState): SharedCharacter {
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
      max: c.initiativeMax ?? 0,
      values: Array.isArray(state.initiativeValues) ? state.initiativeValues : [],
    },
    conditions: state.conditions ?? '',
  };
}
