// GM-side live roster: connect with the gmToken, take the server's persisted
// `roster` as the initial truth, then fold the `update`/`remove`/`presence`
// stream into it. Purely in-memory — the durable copy lives on the server
// (docs/campaign-protocol.md §2), so closing the screen loses nothing.

import { useEffect, useState } from 'react';

import type { Campaign } from '@/db/schema';
import { CampaignSocket, type SocketStatus } from '@/lib/campaign-client';
import { gmHello, type RosterEntry } from '@/lib/campaign-protocol';
import { updateCampaignName } from '@/repositories/campaigns';

export function useGmRoster(campaign: Campaign) {
  const [status, setStatus] = useState<SocketStatus>('offline');
  const [serverError, setServerError] = useState<string | null>(null);
  const [entries, setEntries] = useState<RosterEntry[]>([]);

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
            if (msg.campaign.name && msg.campaign.name !== campaign.name) {
              updateCampaignName(campaign.id, msg.campaign.name).catch(() => {});
            }
            break;
          case 'roster':
            setEntries(msg.characters);
            break;
          case 'update':
            setEntries((prev) => {
              const next = prev.filter((e) => e.charId !== msg.charId);
              const online = prev.find((e) => e.charId === msg.charId)?.online ?? true;
              next.push({
                charId: msg.charId,
                character: msg.character,
                online,
                updatedAt: msg.updatedAt,
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
    socket.connect();
    return () => socket.close();
  }, [campaign.id, campaign.code, campaign.serverUrl, campaign.gmToken, campaign.name]);

  const roster = [...entries].sort((a, b) =>
    String(a.character.nom ?? '').localeCompare(String(b.character.nom ?? '')),
  );
  return { status, serverError, roster };
}
