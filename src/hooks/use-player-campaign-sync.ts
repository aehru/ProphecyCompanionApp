// Player-side live sync: while the campaign screen is open, every local edit of
// the shared character is projected (toSharedCharacter) and pushed to the
// campaign server; the server relays it to the GM. Sync runs only while this
// hook is mounted — v1 keeps no background service (the player has the app open
// at the table anyway).

import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useRef, useState } from 'react';

import { db } from '@/db/client';
import { actualState, characters, type Campaign } from '@/db/schema';
import { CampaignSocket, type SocketStatus } from '@/lib/campaign-client';
import { playerHello, shareMsg, unshareMsg } from '@/lib/campaign-protocol';
import { toSharedCharacter } from '@/lib/character-share';
import { updateCampaignName } from '@/repositories/campaigns';

export function usePlayerCampaignSync(campaign: Campaign, characterId: number | null) {
  const [status, setStatus] = useState<SocketStatus>('offline');
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: charRows } = useLiveQuery(
    db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId ?? -1)),
    [characterId],
  );
  const { data: stateRows } = useLiveQuery(
    db
      .select()
      .from(actualState)
      .where(eq(actualState.characterId, characterId ?? -1)),
    [characterId],
  );
  const character = charRows?.[0];
  const state = stateRows?.[0];
  const charUuid = character?.uuid ?? null;

  const socketRef = useRef<CampaignSocket | null>(null);
  const onlineRef = useRef(false);
  const lastSentRef = useRef<string | null>(null);

  // One socket per (campaign, character-uuid) pairing.
  useEffect(() => {
    if (!charUuid) return;
    lastSentRef.current = null;
    const socket = new CampaignSocket({
      serverUrl: campaign.serverUrl,
      hello: playerHello(campaign.code, charUuid),
      onStatus: (s) => {
        onlineRef.current = s === 'online';
        // Fresh connection: the server state is unknown — force a re-share.
        if (s === 'online') lastSentRef.current = null;
        setStatus(s);
      },
      onMessage: (msg) => {
        if (msg.type === 'welcome') {
          setServerError(null);
          if (msg.campaign.name && msg.campaign.name !== campaign.name) {
            updateCampaignName(campaign.id, msg.campaign.name).catch(() => {});
          }
        } else if (msg.type === 'error') {
          setServerError(msg.code);
        }
      },
    });
    socketRef.current = socket;
    socket.connect();
    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [campaign.id, campaign.code, campaign.serverUrl, campaign.name, charUuid]);

  // Push the projection whenever the live rows change (and once per reconnect).
  useEffect(() => {
    if (!character || !state || !charUuid) return;
    if (!onlineRef.current || !socketRef.current) return;
    const projection = toSharedCharacter(character, state);
    const serialized = JSON.stringify(projection);
    if (serialized === lastSentRef.current) return;
    lastSentRef.current = serialized;
    socketRef.current.send(shareMsg(charUuid, projection));
  }, [character, state, charUuid, status]);

  /** Withdraw the projection from the server (right-to-erasure). */
  const unshare = () => {
    if (charUuid) socketRef.current?.send(unshareMsg(charUuid));
    lastSentRef.current = null;
  };

  return { status, serverError, unshare };
}
