import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { actualState, characters } from '@/db/schema';

/**
 * Per-die initiative marks for every character on THIS device, keyed by portable
 * uuid — which is what a roster entry's `charId` is.
 *
 * Marks are device-local: they are not part of the projection (see
 * docs/campaign-protocol.md §2), so a roster card cannot get them off the wire.
 * The GM's own PNJs live in this DB and therefore have them; a player's
 * character does not exist here, the map has no entry, and the sheet draws
 * unmarked dice. That asymmetry is the design, not a gap.
 *
 * Returned as ONE map rather than a per-character hook because the initiative
 * order renders a row per die: a lookup per row would mean a live query per row.
 */
export function useLocalDieIcons(): Map<string, string[]> {
  const { data } = useLiveQuery(
    db
      .select({ uuid: characters.uuid, icons: actualState.initiativeDiceIcons })
      .from(characters)
      .innerJoin(actualState, eq(actualState.characterId, characters.id)),
  );
  return useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of data ?? []) {
      if (row.uuid) map.set(row.uuid, row.icons ?? []);
    }
    return map;
  }, [data]);
}
