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
//
// Split in two on purpose: the PROVIDER holds only the live-campaign id + the
// status the UI reads, and mounts the BROADCASTER (queries + socket + push) only
// while a campaign is actually live. Solo users therefore pay nothing.

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
import { actualState, characters, effects, skills } from '@/db/schema';
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
  const [campaignName, setCampaignName] = useState('');

  // Auto-resume: restore the last live campaign on launch.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v != null) setLiveId(Number(v));
    });
  }, []);

  const start = useCallback((campaignId: number) => {
    setLiveId(campaignId);
    AsyncStorage.setItem(STORAGE_KEY, String(campaignId)).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    setLiveId(null);
    setStatus('offline');
    setServerError(null);
    setCampaignName('');
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <Ctx.Provider
      value={{ liveCampaignId: liveId, status, serverError, campaignName, start, stop }}>
      {/* The live queries + socket live in a child mounted ONLY while broadcasting.
          Hooks can't be conditional, so keeping them here would subscribe every
          solo user to characters/actual_state/skills/effects for nothing — drizzle
          refetches on any write to a watched table, so each stat edit would cost
          four extra SELECTs and a re-render of this provider. */}
      {liveId != null ? (
        <LiveBroadcaster
          campaignId={liveId}
          onStatus={setStatus}
          onServerError={setServerError}
          onCampaignName={setCampaignName}
        />
      ) : null}
      {children}
    </Ctx.Provider>
  );
}

/**
 * The broadcast engine: mounted only while a campaign is live. Resolves the live
 * campaign -> its shared character -> that character's rows, holds the socket,
 * and pushes the debounced in-play projection. Reports status/error/name up to
 * the provider; unmounting (stop, or the campaign row vanishing) closes the
 * socket through the effect cleanup.
 */
function LiveBroadcaster({
  campaignId,
  onStatus,
  onServerError,
  onCampaignName,
}: {
  campaignId: number;
  onStatus: (s: SocketStatus) => void;
  onServerError: (e: string | null) => void;
  onCampaignName: (n: string) => void;
}) {
  // Local mirror of the status: the debounced push effect keys off it to fire the
  // first full projection as soon as the socket reports online.
  const [status, setStatus] = useState<SocketStatus>('offline');

  const { data: campRows } = useLiveQuery(campaignQuery(campaignId), [campaignId]);
  const campaign = campRows?.[0];
  const { data: shareRows } = useLiveQuery(sharesQuery(campaignId), [campaignId]);
  const characterId = shareRows?.[0]?.characterId ?? null;
  const { data: charRows } = useLiveQuery(
    db.select().from(characters).where(eq(characters.id, characterId ?? -1)),
    [characterId],
  );
  const { data: stateRows } = useLiveQuery(
    db.select().from(actualState).where(eq(actualState.characterId, characterId ?? -1)),
    [characterId],
  );
  const { data: skillRows } = useLiveQuery(
    db.select().from(skills).where(eq(skills.characterId, characterId ?? -1)),
    [characterId],
  );
  const { data: effectRows } = useLiveQuery(
    db.select().from(effects).where(eq(effects.characterId, characterId ?? -1)),
    [characterId],
  );
  const character = charRows?.[0];
  const state = stateRows?.[0];
  const charUuid = character?.uuid ?? null;

  // `welcome` backfills the local campaign name, which would otherwise change the
  // socket effect's deps and reconnect mid-broadcast. Ref-read keeps the name out
  // of the deps: only the connection identity (campaign/character) reconnects.
  const nameRef = useRef(campaign?.name);
  nameRef.current = campaign?.name;

  const socketRef = useRef<CampaignSocket | null>(null);
  const onlineRef = useRef(false);
  const lastSigRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Destructured so the effect closes over the three scalars that actually define
  // the connection, not the row object (whose identity changes on every refetch).
  const campaignRowId = campaign?.id;
  const code = campaign?.code;
  const serverUrl = campaign?.serverUrl;

  // Socket lifecycle: one per (campaign, character-uuid) while live.
  useEffect(() => {
    if (campaignRowId == null || code == null || serverUrl == null || !charUuid) {
      setStatus('offline');
      onStatus('offline');
      return;
    }
    lastSigRef.current = null;
    const socket = new CampaignSocket({
      serverUrl,
      hello: playerHello(code, charUuid),
      onStatus: (s) => {
        onlineRef.current = s === 'online';
        if (s === 'online') lastSigRef.current = null; // force a full push on (re)connect
        setStatus(s);
        onStatus(s);
      },
      onMessage: (msg) => {
        if (msg.type === 'welcome') {
          onServerError(null);
          if (msg.campaign.name && msg.campaign.name !== nameRef.current) {
            updateCampaignName(campaignRowId, msg.campaign.name).catch(() => {});
          }
        } else if (msg.type === 'error') {
          onServerError(msg.code);
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
  }, [campaignRowId, code, serverUrl, charUuid, onStatus, onServerError]);

  // Surface the resolved campaign name (the indicator shows it while live).
  useEffect(() => {
    onCampaignName(campaign?.name ?? '');
  }, [campaign?.name, onCampaignName]);

  // Debounced in-play push.
  useEffect(() => {
    if (!character || !state || !charUuid || !onlineRef.current) return;
    const projection = toSharedCharacter(character, state, skillRows ?? [], effectRows ?? []);
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
  }, [character, state, skillRows, effectRows, charUuid, status]);

  // Engine only — the UI reads everything through the context.
  return null;
}
