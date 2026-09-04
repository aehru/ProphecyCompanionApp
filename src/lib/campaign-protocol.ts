// Campaign WebSocket wire protocol — the TypeScript half of the contract in
// docs/campaign-protocol.md §6 (the Python half lives in the server's
// app/schemas.py). Everything on the wire is camelCase JSON.
//
// This module is PURE (no network, no DB): message builders for what the app
// sends, and a tolerant zod parser for what the server sends. Keeping it pure
// makes the whole protocol unit-testable in plain Node; the socket lives in
// campaign-client.ts.

import { z } from 'zod';

import type { SharedCharacter } from '@/lib/character-share';

// v2: the hello identifies the SESSION, not a character — one socket may share
// N characters (share/unshare carry the charId). Hard break: a v1 hello gets an
// `unsupported_version` error from the server.
//
// Every builder below stamps THIS constant rather than a literal, so bumping it
// is what a version bump is. It is typed `as const` so `v` stays a literal type
// on the wire messages — a widened `number` would let a v3 frame typecheck
// against a v2 handler.
export const PROTOCOL_VERSION = 2 as const;
type V = typeof PROTOCOL_VERSION;

// --- outgoing (client -> server) ----------------------------------------------

export type HelloMsg =
  | { v: V; type: 'hello'; role: 'gm'; code: string; gmToken: string }
  | { v: V; type: 'hello'; role: 'player'; code: string };

export const gmHello = (code: string, gmToken: string): HelloMsg => ({
  v: PROTOCOL_VERSION,
  type: 'hello',
  role: 'gm',
  code,
  gmToken,
});

export const playerHello = (code: string): HelloMsg => ({
  v: PROTOCOL_VERSION,
  type: 'hello',
  role: 'player',
  code,
});

export const shareMsg = (charId: string, character: SharedCharacter) => ({
  v: PROTOCOL_VERSION,
  type: 'share' as const,
  charId,
  character,
});

export const unshareMsg = (charId: string) => ({
  v: PROTOCOL_VERSION,
  type: 'unshare' as const,
  charId,
});

export const pingMsg = () => ({ v: PROTOCOL_VERSION, type: 'ping' as const });

// --- incoming (server -> client) -----------------------------------------------
// Tolerant reader (§4): `character` payloads pass through as opaque records so a
// newer server/app can add fields without breaking us; unknown message types
// parse to `{ type: 'unknown' }` instead of throwing.

const opaqueCharacter = z.record(z.string(), z.unknown());

/** Who shared a roster entry — lets the GM UI badge their own PNJs. */
const ownerSchema = z.enum(['gm', 'player']).catch('player');

export type SharedOwner = z.infer<typeof ownerSchema>;

const rosterEntrySchema = z.object({
  charId: z.string(),
  character: opaqueCharacter,
  online: z.boolean(),
  updatedAt: z.number(),
  owner: ownerSchema,
});

export type RosterEntry = z.infer<typeof rosterEntrySchema>;

const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('welcome'),
    campaign: z.object({ code: z.string(), name: z.string() }),
    role: z.string(),
  }),
  z.object({ type: z.literal('roster'), characters: z.array(rosterEntrySchema) }),
  z.object({
    type: z.literal('update'),
    charId: z.string(),
    character: opaqueCharacter,
    updatedAt: z.number(),
    owner: ownerSchema,
  }),
  z.object({ type: z.literal('remove'), charId: z.string() }),
  z.object({ type: z.literal('presence'), charId: z.string(), online: z.boolean() }),
  z.object({ type: z.literal('pong') }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema> | { type: 'unknown' };

/** Parse one raw frame. Never throws — bad JSON or unknown types are 'unknown'. */
export function parseServerMessage(raw: string): ServerMessage {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { type: 'unknown' };
  }
  const parsed = serverMessageSchema.safeParse(json);
  return parsed.success ? parsed.data : { type: 'unknown' };
}

// --- helpers -------------------------------------------------------------------

/**
 * Normalize a hand-typed join code: trim, uppercase, and map the characters the
 * server's Crockford-base32 alphabet excludes (I/L -> 1, O -> 0) so a user
 * misreading the GM's screen still gets in.
 */
export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0').replace(/\s/g, '');
}

/**
 * The scheme is OUR job, never the user's: they type a host (`app.fr`,
 * `192.168.1.10:8000`) or paste a full URL, and we strip whatever scheme came
 * along. `wsUrl`/`httpUrl` then pick the right protocols.
 */
export function normalizeServerHost(input: string): string {
  return input.trim().replace(/^[a-z]+:\/\//i, '').replace(/\/+$/, '');
}

/**
 * A host that is clearly a LAN/self-host target (bare IPv4, localhost, mDNS
 * .local). These get PLAIN http/ws — a TLS handshake against a plain-HTTP LAN
 * server hangs until the OS timeout, which looks like "the app can't reach the
 * server". Anything else (public domains) gets https/wss: iOS ATS would block
 * cleartext there anyway, and a real deployment sits behind a TLS proxy.
 */
function isLanHost(host: string): boolean {
  const bare = host.split('/')[0].split(':')[0];
  return bare === 'localhost' || bare.endsWith('.local') || /^\d{1,3}(\.\d{1,3}){3}$/.test(bare);
}

/** WS endpoint for a user-entered server (any pasted scheme is discarded). */
export function wsUrl(serverUrl: string): string {
  const host = normalizeServerHost(serverUrl);
  return `${isLanHost(host) ? 'ws' : 'wss'}://${host}/ws`;
}

/** REST base for the same user-entered server (campaign create/delete). */
export function httpUrl(serverUrl: string): string {
  const host = normalizeServerHost(serverUrl);
  return `${isLanHost(host) ? 'http' : 'https'}://${host}`;
}

/** The app's deep-link scheme (app.json `scheme`). */
export const APP_SCHEME = 'prophecyapp';

/**
 * Deep link encoded in the GM's QR code. The in-app scanner (join dialog) reads
 * it via `parseJoinLink`; scanning with the OS camera also works where the
 * scanner app agrees to open custom-scheme URLs (many refuse — hence the
 * in-app scanner).
 */
export function joinLink(code: string, serverUrl: string): string {
  const host = normalizeServerHost(serverUrl);
  return `${APP_SCHEME}://campaigns?code=${encodeURIComponent(code)}&server=${encodeURIComponent(host)}`;
}

/**
 * Inverse of `joinLink`, for the in-app QR scanner. Deliberately looser than
 * the exact link we emit: any scheme/path is accepted as long as `code` and
 * `server` query params are present, so a future https landing-page link (or a
 * hand-forwarded variant) still scans. Not parsed with `new URL()` — React
 * Native's built-in URL lacks `searchParams`. Returns null for foreign QR
 * content (the scanner keeps looking).
 */
export function parseJoinLink(text: string): { code: string; server: string } | null {
  const query = text.trim().split('?')[1];
  if (!query) return null;
  const params: Record<string, string> = {};
  for (const part of query.split('&')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      try {
        params[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
      } catch {
        return null; // malformed percent-encoding — not our link
      }
    }
  }
  if (!params.code || !params.server) return null;
  return { code: normalizeJoinCode(params.code), server: normalizeServerHost(params.server) };
}
