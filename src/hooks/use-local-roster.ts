// The half of the table roster that needs no network: the GM's own NPCs, read
// live from this device's DB and projected with the very same
// `toSharedCharacter` used on the wire, so a local card and a broadcast card are
// the same card.
//
// Reactive by construction (useLiveQuery over the four tables a projection
// touches), so marking a wound on an NPC's sheet updates the roster, the
// initiative order and the split-pane sheet with no socket involved.

import { inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { actualState, characters, effects, skills } from '@/db/schema';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { toSharedCharacter } from '@/lib/character-share';
import { membersQuery } from '@/repositories/campaigns';

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
 * The characters this device owns in a table, as roster entries.
 *
 * `online` is always true: a local row is by definition present — the GM is
 * holding it. The UI distinguishes them by `owner`/`source`, not by presence.
 */
export function useLocalRoster(campaignId: number): RosterEntry[] {
  const { data: memberRows } = useLiveQuery(membersQuery(campaignId), [campaignId]);
  // Sorted ids joined into a string: a stable dep for the row queries below (the
  // array identity changes on every refetch, the KEY only when the set does).
  const memberIds = (memberRows ?? []).map((m) => m.characterId).sort((a, b) => a - b);
  const memberKey = memberIds.join(',');
  // `inArray` with an empty list is invalid SQL — [-1] matches nothing instead.
  const queryIds = memberIds.length > 0 ? memberIds : [-1];

  const { data: charRows } = useLiveQuery(
    db.select().from(characters).where(inArray(characters.id, queryIds)),
    [memberKey],
  );
  const { data: stateRows } = useLiveQuery(
    db.select().from(actualState).where(inArray(actualState.characterId, queryIds)),
    [memberKey],
  );
  const { data: skillRows } = useLiveQuery(
    db.select().from(skills).where(inArray(skills.characterId, queryIds)),
    [memberKey],
  );
  const { data: effectRows } = useLiveQuery(
    db.select().from(effects).where(inArray(effects.characterId, queryIds)),
    [memberKey],
  );

  return useMemo(() => {
    const stateByChar = new Map((stateRows ?? []).map((s) => [s.characterId, s]));
    const skillsByChar = groupBy(skillRows ?? [], (s) => s.characterId);
    const effectsByChar = groupBy(effectRows ?? [], (e) => e.characterId);
    const entries: RosterEntry[] = [];
    for (const character of charRows ?? []) {
      const state = stateByChar.get(character.id);
      // A character with no uuid yet (pre-backfill) has no roster identity.
      if (!character.uuid || !state) continue;
      entries.push({
        charId: character.uuid,
        character: toSharedCharacter(
          character,
          state,
          skillsByChar.get(character.id) ?? [],
          effectsByChar.get(character.id) ?? [],
        ) as RosterEntry['character'],
        online: true,
        updatedAt: character.updatedAt?.getTime() ?? 0,
        owner: 'gm',
      });
    }
    return entries;
  }, [charRows, stateRows, skillRows, effectRows]);
}
