// Live projections for a set of local characters — the one place that knows
// which tables a `SharedCharacter` is assembled from.
//
// Two callers need exactly this, for opposite reasons: the broadcaster pushes
// the projections over the socket (use-campaign-live), and the local roster
// renders them without any socket at all (use-local-roster). Keeping the
// assembly here means a projection is built the same way on both paths — the
// merge in lib/roster-merge can only be trusted while that holds.

import { inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { actualState, characters, effects, skills } from '@/db/schema';
import { toSharedCharacter, type SharedCharacter } from '@/lib/character-share';

export interface CharacterProjection {
  /** The character's portable uuid — its identity on the roster and the wire. */
  uuid: string;
  /** Local row id, for callers that need to write back. */
  id: number;
  /** When the sheet was last touched (ms). */
  updatedAt: number;
  projection: SharedCharacter;
}

function groupBy<T>(rows: T[], key: (row: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * Project the given characters, live. Characters without a uuid (pre-backfill)
 * or without their `actual_state` row are skipped: they have no roster identity
 * and nothing to project.
 *
 * `ids` may be a fresh array on every render — only its CONTENT drives the
 * queries (the sorted ids are joined into a string key), so a refetch doesn't
 * re-subscribe.
 */
export function useCharacterProjections(ids: readonly number[]): CharacterProjection[] {
  const sortedIds = [...ids].sort((a, b) => a - b);
  const key = sortedIds.join(',');
  // `inArray` with an empty list is invalid SQL — [-1] matches nothing instead.
  const queryIds = sortedIds.length > 0 ? sortedIds : [-1];

  const { data: charRows } = useLiveQuery(
    db.select().from(characters).where(inArray(characters.id, queryIds)),
    [key],
  );
  const { data: stateRows } = useLiveQuery(
    db.select().from(actualState).where(inArray(actualState.characterId, queryIds)),
    [key],
  );
  const { data: skillRows } = useLiveQuery(
    db.select().from(skills).where(inArray(skills.characterId, queryIds)),
    [key],
  );
  const { data: effectRows } = useLiveQuery(
    db.select().from(effects).where(inArray(effects.characterId, queryIds)),
    [key],
  );

  return useMemo(() => {
    const stateByChar = new Map((stateRows ?? []).map((s) => [s.characterId, s]));
    const skillsByChar = groupBy(skillRows ?? [], (s) => s.characterId);
    const effectsByChar = groupBy(effectRows ?? [], (e) => e.characterId);
    const out: CharacterProjection[] = [];
    for (const character of charRows ?? []) {
      const state = stateByChar.get(character.id);
      if (!character.uuid || !state) continue;
      out.push({
        uuid: character.uuid,
        id: character.id,
        updatedAt: character.updatedAt?.getTime() ?? 0,
        projection: toSharedCharacter(
          character,
          state,
          skillsByChar.get(character.id) ?? [],
          effectsByChar.get(character.id) ?? [],
        ),
      });
    }
    return out;
  }, [charRows, stateRows, skillRows, effectRows]);
}
