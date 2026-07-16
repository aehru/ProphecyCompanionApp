// App-level live-broadcast service. Unlike the old screen hook, this lives ABOVE
// navigation: once a player goes live, the socket keeps pushing while the app is
// foregrounded on ANY screen, and (auto-resume) even across app restarts. Only
// ONE campaign is live at a time.
//
// Behaviour (all decided with the user):
//  - push only when an IN-PLAY value changes (inPlaySignature), 5s debounced;
//    sheet stats are captured in the first push and otherwise frozen;
//  - the first push after each (re)connect is immediate, so the GM gets the full
//    projection right away;
//  - STOP = pause: the socket closes, the last state stays on the server (the
//    GM still sees it); erasure is the separate "leave campaign" flow;
//  - background/lock drops the socket; it auto-reconnects on return.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { db } from '@/db/client';
import { actualState, characters } from '@/db/schema';
import { CampaignSocket, type SocketStatus } from '@/lib/campaign-client';
import { inPlaySignature, LIVE_DEBOUNCE_MS } from '@/lib/campaign-live';
import { playerHello, shareMsg } from '@/lib/campaign-protocol';
import { toSharedCharacter } from '@/lib/character-share';
import { campaignQuery, sharesQuery, updateCampaignName } from '@/repositories/campaigns';

const STORAGE_KEY = 'campaign.live.id';

interface LiveContext {
  /** The campaign currently broadcasting, or null. */
  liveCampaignId: number | null;
  status: SocketStatus;
  serverError: string | null;
  campaignName: string;
  /** Go live for a campaign (must already have a shared character). */
  start: (campaignId: number) => void;
  /** Pause: stop pushing, leave the last state on the server. */
  stop: () => void;
}

const Ctx = createContext<LiveContext | null>(null);

export function useCampaignLive(): LiveContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCampaignLive must be used within CampaignLiveProvider');
  return ctx;
}

export function CampaignLiveProvider({ children }: { children: React.ReactNode }) {
  const [liveId, setLiveId] = useState<number | null>(null);
  const [status, setStatus] = useState<SocketStatus>('offline');
  const [serverError, setServerError] = useState<string | null>(null);

  // Auto-resume: restore the last live campaign on launch.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v != null) setLiveId(Number(v));
    });
  }, []);

  // Resolve the live campaign -> its shared character -> live rows.
  const { data: campRows } = useLiveQuery(campaignQuery(liveId ?? -1), [liveId]);
  const campaign = campRows?.[0];
  const { data: shareRows } = useLiveQuery(sharesQuery(liveId ?? -1), [liveId]);
  const characterId = shareRows?.[0]?.characterId ?? null;
  const { data: charRows } = useLiveQuery(
    db.select().from(characters).where(eq(characters.id, characterId ?? -1)),
    [characterId],
  );
  const { data: stateRows } = useLiveQuery(
    db.select().from(actualState).where(eq(actualState.characterId, characterId ?? -1)),
    [characterId],
  );
  const character = charRows?.[0];
  const state = stateRows?.[0];
  const charUuid = character?.uuid ?? null;

  const socketRef = useRef<CampaignSocket | null>(null);
  const onlineRef = useRef(false);
  const lastSigRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Socket lifecycle: one per (campaign, character-uuid) while live.
  useEffect(() => {
    if (!campaign || !charUuid) {
      setStatus('offline');
      return;
    }
    lastSigRef.current = null;
    const socket = new CampaignSocket({
      serverUrl: campaign.serverUrl,
      hello: playerHello(campaign.code, charUuid),
      onStatus: (s) => {
        onlineRef.current = s === 'online';
        if (s === 'online') lastSigRef.current = null; // force a full push on (re)connect
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
      socket.close();
      socketRef.current = null;
      onlineRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [campaign?.id, campaign?.code, campaign?.serverUrl, campaign?.name, charUuid]);

  // Debounced in-play push.
  useEffect(() => {
    if (!character || !state || !charUuid || !onlineRef.current) return;
    const projection = toSharedCharacter(character, state);
    const sig = inPlaySignature(projection);
    if (sig === lastSigRef.current) return;
    const send = () => {
      lastSigRef.current = sig;
      socketRef.current?.send(shareMsg(charUuid, projection));
    };
    // First push after a (re)connect is immediate; later in-play changes debounce.
    if (lastSigRef.current === null) {
      send();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(send, LIVE_DEBOUNCE_MS);
    }
  }, [character, state, charUuid, status]);

  const start = useCallback((campaignId: number) => {
    setLiveId(campaignId);
    AsyncStorage.setItem(STORAGE_KEY, String(campaignId)).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    setLiveId(null);
    setStatus('offline');
    setServerError(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <Ctx.Provider
      value={{
        liveCampaignId: liveId,
        status,
        serverError,
        campaignName: campaign?.name ?? '',
        start,
        stop,
      }}>
      {children}
    </Ctx.Provider>
  );
}
