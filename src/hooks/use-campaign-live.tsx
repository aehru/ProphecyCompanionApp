// App-level live-broadcast service. Unlike the old screen hook, this lives ABOVE
// navigation: once a member goes live, the socket keeps pushing while the app is
// foregrounded on ANY screen, and (auto-resume) even across app restarts. Only
// ONE campaign is live at a time.
//
// Behaviour (all decided with the user):
//  - v2: ALL characters shared into the campaign broadcast on one socket; a push
//    fires whenever a character's projection changes (projectionSignature) —
//    in-play values AND sheet edits — on a shared 5s debounce, so finishing a
//    character edit syncs to the GM without any extra action;
//  - the first push after each (re)connect is immediate (per character), so the
//    GM gets the full projection right away;
//  - unchecking a character while live sends `unshare` immediately (the ghost-
//    roster fix) — the paused path is handled by the salons via unshareFromServer;
//  - players broadcast; a GM only does when they opted into `shareNpcs` (their
//    NPCs are rendered from the local DB, so publishing them is purely the
//    co-GM/second-screen case — off by default);
//  - STOP = pause: the socket closes, the last state stays on the server (the
//    GM still sees it); erasure is the separate "leave campaign" flow;
//  - background/lock drops the socket; it auto-reconnects on return.
//
// Split in two on purpose: the PROVIDER holds only the live-campaign id + the
// status the UI reads, and mounts the BROADCASTER (queries + socket + push) only
// while a campaign is actually live. Solo users therefore pay nothing.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useCharacterProjections } from '@/hooks/use-character-projections';
import { CampaignSocket, type SocketStatus } from '@/lib/campaign-client';
import { diffShares, LIVE_DEBOUNCE_MS, projectionSignature } from '@/lib/campaign-live';
import { gmHello, playerHello, unshareMsg, shareMsg } from '@/lib/campaign-protocol';
import { campaignQuery, membersQuery, updateCampaignName } from '@/repositories/campaigns';

const STORAGE_KEY = 'campaign.live.id';

interface LiveContext {
  /** The campaign currently broadcasting, or null. */
  liveCampaignId: number | null;
  status: SocketStatus;
  serverError: string | null;
  campaignName: string;
  /** How many characters the live campaign currently broadcasts. */
  sharedCount: number;
  /** Go live for a campaign (must already have at least one shared character). */
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
  const [sharedCount, setSharedCount] = useState(0);

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
    setSharedCount(0);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <Ctx.Provider
      value={{
        liveCampaignId: liveId,
        status,
        serverError,
        campaignName,
        sharedCount,
        start,
        stop,
      }}>
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
          onSharedCount={setSharedCount}
          onNothingToBroadcast={stop}
        />
      ) : null}
      {children}
    </Ctx.Provider>
  );
}

/**
 * The broadcast engine: mounted only while a campaign is live. Resolves the live
 * campaign -> ALL of its shared characters -> their rows, holds the ONE socket
 * (v2: the hello identifies the session, share/unshare frames carry the charId),
 * and pushes the debounced in-play projections. Reports status/error/name up to
 * the provider; unmounting (stop, or the campaign row vanishing) closes the
 * socket through the effect cleanup.
 */
function LiveBroadcaster({
  campaignId,
  onStatus,
  onServerError,
  onCampaignName,
  onSharedCount,
  onNothingToBroadcast,
}: {
  campaignId: number;
  onStatus: (s: SocketStatus) => void;
  onServerError: (e: string | null) => void;
  onCampaignName: (n: string) => void;
  onSharedCount: (n: number) => void;
  /** There is nothing for this campaign to publish — go back to idle. */
  onNothingToBroadcast: () => void;
}) {
  // Local mirror of the status: the debounced push effect keys off it to fire the
  // first full projection as soon as the socket reports online.
  const [status, setStatus] = useState<SocketStatus>('offline');

  const { data: campRows } = useLiveQuery(campaignQuery(campaignId), [campaignId]);
  const campaign = campRows?.[0];
  const { data: shareRows } = useLiveQuery(membersQuery(campaignId), [campaignId]);
  const sharedIds = (shareRows ?? []).map((s) => s.characterId);
  // Same projections the local roster renders — assembled once, in one place.
  const projected = useCharacterProjections(sharedIds);

  // `welcome` backfills the local campaign name, which would otherwise change the
  // socket effect's deps and reconnect mid-broadcast. Ref-read keeps the name out
  // of the deps: only the connection identity reconnects.
  // Written in an effect, not during render: a ref write while rendering is a
  // side effect the React Compiler rejects. Only the socket's `welcome` callback
  // reads it, and that cannot fire before the connect effect below has run.
  const nameRef = useRef(campaign?.name);
  useEffect(() => {
    nameRef.current = campaign?.name;
  });

  const socketRef = useRef<CampaignSocket | null>(null);
  const onlineRef = useRef(false);
  /** Last pushed projection signature per character uuid. */
  const lastSigsRef = useRef<Map<string, string>>(new Map());
  /** Uuids pushed by the previous run — diffed to emit live `unshare`s. */
  const prevUuidsRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Destructured so the effect closes over the scalars that actually define the
  // connection, not the row object (whose identity changes on every refetch).
  const campaignRowId = campaign?.id;
  const code = campaign?.code;
  const serverUrl = campaign?.serverUrl;
  const role = campaign?.role;
  const gmToken = campaign?.gmToken;
  // A GM publishes their NPCs only on request (see the header). Guarded here and
  // not only in the UI, because auto-resume can revive a live campaign on launch.
  const npcsMuted = role === 'gm' && !campaign?.shareNpcs;

  // Socket lifecycle: ONE per campaign while live — v2 hellos carry no charId,
  // so the shared set can change freely without a reconnect.
  useEffect(() => {
    if (campaignRowId == null || code == null || serverUrl == null || role == null || npcsMuted) {
      setStatus('offline');
      onStatus('offline');
      return;
    }
    lastSigsRef.current.clear();
    prevUuidsRef.current = [];
    const socket = new CampaignSocket({
      serverUrl,
      hello: role === 'gm' && gmToken ? gmHello(code, gmToken) : playerHello(code),
      onStatus: (s) => {
        onlineRef.current = s === 'online';
        // Force a full push of every character on (re)connect.
        if (s === 'online') lastSigsRef.current.clear();
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
        // A GM broadcaster also receives roster/update frames — ignored here,
        // the roster UI has its own socket (see ROADMAP: merge them one day).
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
  }, [campaignRowId, code, serverUrl, role, gmToken, npcsMuted, onStatus, onServerError]);

  // A GM row that doesn't publish its NPCs has nothing to broadcast: end the
  // live session rather than leave the global indicator pulsing at a socket that
  // will never connect (this is also what an auto-resumed pre-local-table
  // campaign lands on after the update).
  useEffect(() => {
    if (npcsMuted) onNothingToBroadcast();
  }, [npcsMuted, onNothingToBroadcast]);

  // Surface the resolved campaign name (the indicator shows it while live).
  useEffect(() => {
    onCampaignName(campaign?.name ?? '');
  }, [campaign?.name, onCampaignName]);

  // What the indicator counts is what actually goes out, i.e. the characters
  // that survived projection (uuid + state), not the raw membership rows.
  const sharedCount = projected.length;
  useEffect(() => {
    onSharedCount(sharedCount);
  }, [sharedCount, onSharedCount]);

  // Debounced projection push, one socket for N characters. Gated on `online` so
  // prevUuidsRef only advances while the unshare diff can actually be sent — a
  // character removed while offline still gets its `unshare` on reconnect.
  useEffect(() => {
    if (!onlineRef.current) return;

    const projections = projected.map((p) => ({
      uuid: p.uuid,
      sig: projectionSignature(p.projection),
      msg: shareMsg(p.uuid, p.projection),
    }));

    // Live unshare for characters that left the shared set (ghost-roster fix).
    const uuids = projections.map((p) => p.uuid).sort();
    const { removed } = diffShares(prevUuidsRef.current, uuids);
    for (const uuid of removed) {
      socketRef.current?.send(unshareMsg(uuid));
      lastSigsRef.current.delete(uuid);
    }
    prevUuidsRef.current = uuids;

    // New characters (no signature yet — first frame after connect or a fresh
    // share) push immediately; changed ones ride the shared debounce.
    let debounced = false;
    for (const p of projections) {
      const last = lastSigsRef.current.get(p.uuid);
      if (last === undefined) {
        lastSigsRef.current.set(p.uuid, p.sig);
        socketRef.current?.send(p.msg);
      } else if (last !== p.sig) {
        debounced = true;
      }
    }
    if (debounced) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Send whatever still differs, from THIS run's snapshot (the newest —
        // any later change re-ran the effect and replaced this timer).
        for (const p of projections) {
          if (lastSigsRef.current.get(p.uuid) !== p.sig) {
            lastSigsRef.current.set(p.uuid, p.sig);
            socketRef.current?.send(p.msg);
          }
        }
      }, LIVE_DEBOUNCE_MS);
    }
  }, [projected, status]);

  // Engine only — the UI reads everything through the context.
  return null;
}
