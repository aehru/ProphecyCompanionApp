import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { campaigns, campaignShares, characters, gmNotes, type Campaign } from '@/db/schema';
import { CampaignSocket } from '@/lib/campaign-client';
import {
  httpUrl,
  normalizeJoinCode,
  normalizeServerHost,
  playerHello,
  unshareMsg,
} from '@/lib/campaign-protocol';
import { nextNpcName } from '@/lib/npc-name';
import { newUuid } from '@/lib/uuid';
import { createCharacter, updateCharacter } from '@/repositories/characters';
import { duplicateCharacter } from '@/repositories/transfer';

/** Live query for the campaign list, for useLiveQuery. */
export function campaignsListQuery() {
  return db.select().from(campaigns).orderBy(campaigns.createdAt);
}

/** Live query for one campaign row (name refreshes when `welcome` lands). */
export function campaignQuery(id: number) {
  return db.select().from(campaigns).where(eq(campaigns.id, id));
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Create a table. LOCAL ONLY — no server, no code, no network: the GM can run
 * their NPCs, roll initiative and read sheets offline forever. Attaching a relay
 * later (`attachServer`) is what adds the players' characters on top.
 */
export async function createLocalTable(name: string): Promise<Campaign> {
  const [row] = await db
    .insert(campaigns)
    .values({ name, role: 'gm', createdAt: new Date() })
    .returning();
  return row;
}

/** How long a create call may take before we give up with a clear error. */
const CREATE_TIMEOUT_MS = 10_000;

/**
 * Attach a relay server to an existing local table: the server mints the join
 * code, and the local row gains code + gmToken + serverUrl. The portable gmToken
 * is generated here and only its hash ever reaches the server — the raw token
 * stays in this row (and the user's backups) as proof of ownership.
 *
 * `signal` lets the UI cancel in flight (the dialog's "Annuler"); an internal
 * 10s timeout turns an unreachable server into a fast, explicit failure instead
 * of hanging on the OS connect timeout. Both surface as an abort — the caller
 * tells them apart via its own cancelled flag.
 */
export async function attachServer(
  campaignId: number,
  serverUrl: string,
  signal?: AbortSignal,
): Promise<Campaign> {
  const existing = await getCampaign(campaignId);
  if (!existing) throw new Error('Table introuvable.');
  const name = existing.name;
  const gmToken = newUuid();
  const host = normalizeServerHost(serverUrl);
  // AbortSignal.any/timeout aren't available on Hermes — combine by hand.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);
  const forward = () => controller.abort();
  signal?.addEventListener('abort', forward);
  let res: Response;
  try {
    res = await fetch(`${httpUrl(host)}/campaigns`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, gmToken }),
      signal: controller.signal,
    });
  } catch (e) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new Error(
        'Serveur injoignable (délai dépassé). Vérifiez l’adresse, que le serveur tourne, et le pare-feu.',
      );
    }
    throw e; // user cancel (AbortError) or a real network error
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }
  if (!res.ok) throw new Error(`Le serveur a refusé la création (${res.status}).`);
  const body = (await res.json()) as { code: string };
  const [row] = await db
    .update(campaigns)
    .set({ code: body.code, gmToken, serverUrl: host })
    .where(eq(campaigns.id, campaignId))
    .returning();
  return row;
}

/**
 * Publish the GM's NPCs to the relay (off by default — they are rendered from
 * the local DB and have no reason to leave the device). Turning it OFF purges
 * whatever is already up there, best-effort.
 */
export async function setShareNpcs(campaignId: number, share: boolean): Promise<void> {
  await db.update(campaigns).set({ shareNpcs: share }).where(eq(campaigns.id, campaignId));
  if (share) return;
  const campaign = await getCampaign(campaignId);
  if (!campaign?.serverUrl || !campaign.code) return;
  const rows = await db
    .select({ uuid: characters.uuid })
    .from(characters)
    .innerJoin(campaignShares, eq(campaignShares.characterId, characters.id))
    .where(eq(campaignShares.campaignId, campaignId));
  for (const r of rows) {
    if (r.uuid) unshareFromServer(campaign, r.uuid).catch(() => {});
  }
}

/**
 * Names of the given characters that are members of at least one campaign
 * (`campaign_shares`). Used to warn before a batch delete: dropping a character
 * that a table still lists is legal but rarely what the user meant. Distinct by
 * character — a row shared into two campaigns is named once.
 */
export async function sharedCharacterNames(ids: readonly number[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .selectDistinct({ id: characters.id, nom: characters.nom })
    .from(characters)
    .innerJoin(campaignShares, eq(campaignShares.characterId, characters.id))
    .where(inArray(characters.id, [...ids]));
  return rows.map((r) => r.nom || 'Sans nom');
}

/**
 * Join an existing campaign as a player: local row only — membership on the
 * server is implied by connecting with the code. The campaign name arrives with
 * the `welcome` frame; store the code as a placeholder name until then.
 */
export async function joinCampaign(code: string, serverUrl: string): Promise<Campaign> {
  const normalized = normalizeJoinCode(code);
  const [row] = await db
    .insert(campaigns)
    .values({
      code: normalized,
      name: normalized,
      role: 'player',
      serverUrl: normalizeServerHost(serverUrl),
      createdAt: new Date(),
    })
    .returning();
  return row;
}

/** Backfill the real campaign name once a `welcome` frame delivers it. */
export async function updateCampaignName(id: number, name: string): Promise<void> {
  await db.update(campaigns).set({ name }).where(eq(campaigns.id, id));
}

/**
 * Best-effort purge of one character's projection from the campaign server: a
 * short-lived socket that says hello, unshares, and closes. Resolves once sent
 * (there is no ack for unshare) or after a short timeout when unreachable.
 * Used when the campaign is NOT currently broadcasting (unchecking a character
 * while live rides the live socket instead — use-campaign-live's diff). A v2
 * player hello works for GM-role rows too: unshare is unrestricted for room
 * members, and a charId-less hello has no presence side effect.
 */
export function unshareFromServer(campaign: Campaign, charUuid: string): Promise<void> {
  // A table with no relay attached has nothing to purge.
  const { serverUrl, code } = campaign;
  if (!serverUrl || !code) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = (socket: CampaignSocket) => {
      socket.close();
      resolve();
    };
    const socket: CampaignSocket = new CampaignSocket({
      serverUrl,
      hello: playerHello(code),
      onMessage: (msg) => {
        // welcome = the hello was accepted; the unshare right behind it will be
        // processed in order — safe to close.
        if (msg.type === 'welcome') {
          socket.send(unshareMsg(charUuid));
          finish(socket);
        } else if (msg.type === 'error') {
          finish(socket);
        }
      },
    });
    socket.connect();
    // Unreachable server: don't block the leave flow.
    setTimeout(() => finish(socket), 4000);
  });
}

/**
 * Leave/delete a campaign — the right-to-erasure path (docs §7).
 *  - GM: DELETE the campaign server-side (purges every projection).
 *  - Player: unshare each shared character so the projection rows are purged
 *    (a bare local delete would leave them on the server forever).
 * A local table (no relay attached) has nothing to erase remotely.
 * Best-effort: the local row goes away even if the server is unreachable.
 * Local FK cascade removes membership rows and notes; the NPC character rows
 * themselves survive (they are ordinary characters, reusable at another table).
 */
export async function deleteCampaign(id: number): Promise<void> {
  const campaign = await getCampaign(id);
  if (!campaign) return;
  if (campaign.role === 'gm' && campaign.gmToken && campaign.serverUrl && campaign.code) {
    try {
      await fetch(`${httpUrl(campaign.serverUrl)}/campaigns/${campaign.code}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gmToken: campaign.gmToken }),
      });
    } catch {
      // Offline — the local row still goes; an idle server campaign is harmless
      // and the retention TODO reaps it eventually.
    }
  } else if (campaign.role === 'player') {
    const shares = await db
      .select()
      .from(campaignShares)
      .where(eq(campaignShares.campaignId, id));
    if (shares.length > 0) {
      const rows = await db
        .select({ uuid: characters.uuid })
        .from(characters)
        .where(inArray(characters.id, shares.map((s) => s.characterId)));
      for (const r of rows) {
        if (r.uuid) await unshareFromServer(campaign, r.uuid);
      }
    }
  }
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

/**
 * Live query: which characters belong to one table. GM side that IS the roster
 * (read locally); player side it is the set broadcast to the GM.
 */
export function membersQuery(campaignId: number) {
  return db.select().from(campaignShares).where(eq(campaignShares.campaignId, campaignId));
}

/** Add/remove one character from one table. */
export async function setMember(
  campaignId: number,
  characterId: number,
  member: boolean,
): Promise<void> {
  const where = and(
    eq(campaignShares.campaignId, campaignId),
    eq(campaignShares.characterId, characterId),
  );
  if (!member) {
    await db.delete(campaignShares).where(where);
    return;
  }
  const existing = await db.select().from(campaignShares).where(where).limit(1);
  if (existing.length === 0) {
    await db.insert(campaignShares).values({ campaignId, characterId });
  }
}

/**
 * Create an NPC and put it on the table in one step — the "I need a garde, now"
 * path. It is an ordinary character row (`kind: 'npc'`), so the full sheet, the
 * catalogues and the export all work on it; only `nom` is required.
 */
export async function createNpc(campaignId: number, nom: string): Promise<{ id: number }> {
  const row = await createCharacter({ nom: nom.trim() || 'PNJ', kind: 'npc' });
  await setMember(campaignId, row.id, true);
  return { id: row.id };
}

/**
 * Spawn another copy of one of the GM's NPCs — the "three identical gardes,
 * three separate wound tracks" case. The copy is a full character row of its
 * own (fresh uuid, own `actual_state`), numbered into the source's series
 * rather than suffixed "(copie)", and joined to the table straight away so it
 * lands on the roster without a second trip.
 *
 * Keyed by uuid because the caller holds a roster entry, not a local id. The
 * copy shows up on the roster immediately — the roster is read from the local
 * DB, no server involved.
 */
export async function spawnNpc(
  campaignId: number,
  charUuid: string,
): Promise<{ id: number; nom: string } | null> {
  const rows = await db.select().from(characters).where(eq(characters.uuid, charUuid)).limit(1);
  const source = rows[0];
  if (!source) return null;
  // Read the names before duplicating, so the copy's own "(copie)" name can't
  // confuse the numbering.
  const taken = await db.select({ nom: characters.nom }).from(characters);
  const id = await duplicateCharacter(source.id);
  if (id == null) return null;
  const nom = nextNpcName(source.nom, taken.map((r) => r.nom));
  // `kind` explicitly: the source may be a player character the GM borrowed as
  // a stand-in, and a spawn is always an NPC.
  await updateCharacter(id, { nom, kind: 'npc' });
  await setMember(campaignId, id, true);
  return { id, nom };
}

/** Live query: the GM's private notes for one campaign. */
export function gmNotesQuery(campaignId: number) {
  return db.select().from(gmNotes).where(eq(gmNotes.campaignId, campaignId));
}

/** Create/replace the GM's note about one roster character (GM device only). */
export async function upsertGmNote(
  campaignId: number,
  charUuid: string,
  body: string,
): Promise<void> {
  const where = and(eq(gmNotes.campaignId, campaignId), eq(gmNotes.charUuid, charUuid));
  const existing = await db.select().from(gmNotes).where(where).limit(1);
  if (existing.length > 0) {
    await db.update(gmNotes).set({ body, updatedAt: new Date() }).where(where);
  } else {
    await db.insert(gmNotes).values({ campaignId, charUuid, body, updatedAt: new Date() });
  }
}
