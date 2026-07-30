// The half of the table roster that needs no network: the characters this device
// owns at a table, projected exactly like they would be on the wire (same
// `toSharedCharacter`, via use-character-projections), so a local card and a
// broadcast card are the same card.
//
// Reactive by construction, so marking a wound on an NPC's sheet updates the
// roster, the initiative order and the split-pane sheet with no socket involved.

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { useCharacterProjections } from '@/hooks/use-character-projections';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { membersQuery } from '@/repositories/campaigns';

/**
 * The characters this device owns in a table, as roster entries.
 *
 * `online` is always true: a local row is by definition present — the GM is
 * holding it. The UI distinguishes them by `owner`/`source`, not by presence.
 */
export function useLocalRoster(campaignId: number): RosterEntry[] {
  const { data: memberRows } = useLiveQuery(membersQuery(campaignId), [campaignId]);
  const memberIds = (memberRows ?? []).map((m) => m.characterId);
  const projections = useCharacterProjections(memberIds);

  return useMemo(
    () =>
      projections.map((p) => ({
        charId: p.uuid,
        character: p.projection as RosterEntry['character'],
        online: true,
        updatedAt: p.updatedAt,
        owner: 'gm' as const,
      })),
    [projections],
  );
}
