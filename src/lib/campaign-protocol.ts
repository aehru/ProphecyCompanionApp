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

export const PROTOCOL_VERSION = 1;

// --- outgoing (client -> server) ----------------------------------------------

export type HelloMsg =
  | { v: 1; type: 'hello'; role: 'gm'; code: string; gmToken: string }
  | { v: 1; type: 'hello'; role: 'player'; code: string; charId: string };

export const gmHello = (code: string, gmToken: string): HelloMsg => ({
  v: 1,
  type: 'hello',
  role: 'gm',
  code,
  gmToken,
});

export const playerHello = (code: string, charId: string): HelloMsg => ({
  v: 1,
  type: 'hello',
  role: 'player',
  code,
  charId,
});

export const shareMsg = (charId: string, character: SharedCharacter) => ({
  v: 1 as const,
  type: 'share' as const,
  charId,
  character,
});

export const unshareMsg = (charId: string) => ({
  v: 1 as const,
  type: 'unshare' as const,
  charId,
});

export const pingMsg = () => ({ v: 1 as const, type: 'ping' as const });

// --- incoming (server -> client) -----------------------------------------------
// Tolerant reader (§4): `character` payloads pass through as opaque records so a
// newer server/app can add fields without breaking us; unknown message types
// parse to `{ type: 'unknown' }` instead of throwing.

const opaqueCharacter = z.record(z.string(), z.unknown());

const rosterEntrySchema = z.object({
  charId: z.string(),
  character: opaqueCharacter,
  online: z.boolean(),
  updatedAt: z.number(),
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
 * Build the WS endpoint from a user-entered server URL. Accepts http(s)/ws(s),
 * with or without trailing slash; anything schemeless gets wss.
 */
export function wsUrl(serverUrl: string): string {
  let base = serverUrl.trim().replace(/\/+$/, '');
  if (/^http(s?):\/\//i.test(base)) base = base.replace(/^http/i, 'ws');
  else if (!/^ws(s?):\/\//i.test(base)) base = `wss://${base}`;
  return `${base}/ws`;
}

/** REST base from the same user-entered URL (campaign create/delete). */
export function httpUrl(serverUrl: string): string {
  let base = serverUrl.trim().replace(/\/+$/, '');
  if (/^ws(s?):\/\//i.test(base)) base = base.replace(/^ws/i, 'http');
  else if (!/^http(s?):\/\//i.test(base)) base = `https://${base}`;
  return base;
}
