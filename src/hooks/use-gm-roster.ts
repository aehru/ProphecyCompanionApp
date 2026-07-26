// GM-side live roster: connect with the gmToken, take the server's persisted
// `roster` as the initial truth, then fold the `update`/`remove`/`presence`
// stream into it. Purely in-memory — the durable copy lives on the server
// (docs/campaign-protocol.md §2), so closing the screen loses nothing.

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Campaign } from '@/db/schema';
import { CampaignSocket, type SocketStatus } from '@/lib/campaign-client';
import { gmHello, unshareMsg, type RosterEntry } from '@/lib/campaign-protocol';
import { updateCampaignName } from '@/repositories/campaigns';

export function useGmRoster(campaign: Campaign) {
  const [status, setStatus] = useState<SocketStatus>('offline');
  const [serverError, setServerError] = useState<string | null>(null);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const socketRef = useRef<CampaignSocket | null>(null);

  // The `welcome` handler backfills the local name, which changes `campaign` and
  // would tear the socket down mid-session. Read the name through a ref so it
  // stays out of the effect's deps: only the connection identity reconnects.
  const nameRef = useRef(campaign.name);
  nameRef.current = campaign.name;

  useEffect(() => {
    if (!campaign.gmToken) return;
    const socket = new CampaignSocket({
      serverUrl: campaign.serverUrl,
      hello: gmHello(campaign.code, campaign.gmToken),
      onStatus: setStatus,
      onMessage: (msg) => {
        switch (msg.type) {
          case 'welcome':
            setServerError(null);
            if (msg.campaign.name && msg.campaign.name !== nameRef.current) {
              updateCampaignName(campaign.id, msg.campaign.name).catch(() => {});
            }
            break;
          case 'roster':
            setEntries(msg.characters);
            break;
          case 'update':
            setEntries((prev) => {
              const next = prev.filter((e) => e.charId !== msg.charId);
              // An update is proof of presence: the server only accepts a share
              // from the live socket that joined as that charId, so mark the
              // player online rather than carrying a previous value. Without
              // this, a stale `presence:false` (broadcast by a dead socket's
              // cleanup after the player already reconnected) would stick
              // forever even while their updates keep streaming in.
              next.push({
                charId: msg.charId,
                character: msg.character,
                online: true,
                updatedAt: msg.updatedAt,
                owner: msg.owner,
              });
              return next;
            });
            break;
          case 'remove':
            setEntries((prev) => prev.filter((e) => e.charId !== msg.charId));
            break;
          case 'presence':
            setEntries((prev) =>
              prev.map((e) => (e.charId === msg.charId ? { ...e, online: msg.online } : e)),
            );
            break;
          case 'error':
            setServerError(msg.code);
            break;
        }
      },
    });
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [campaign.id, campaign.code, campaign.serverUrl, campaign.gmToken]);

  /**
   * Kick: purge one roster entry from the server (v2 `unshare` is unrestricted
   * for room members — docs §security). Purge only, no ban: the owner's next
   * share re-adds it. The optimistic local removal is confirmed by the server's
   * `remove` broadcast.
   */
  const kick = useCallback((charId: string) => {
    socketRef.current?.send(unshareMsg(charId));
    setEntries((prev) => prev.filter((e) => e.charId !== charId));
  }, []);

  const roster = [...entries].sort((a, b) =>
    String(a.character.nom ?? '').localeCompare(String(b.character.nom ?? '')),
  );
  return { status, serverError, roster, kick };
}
