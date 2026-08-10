// Allow-list redaction — the privacy boundary of the diagnostic log.
//
// Nothing reaches a log file unless its key is on {@link ALLOWED_PAYLOAD_KEYS}.
// Everything else is dropped and only *counted*, surfacing as `_dropped: n`, so
// a reader can tell "there was more here" without the content ever existing on
// disk. Records are referenced by opaque local id (`characterId`, `uuid`), never
// by anything the user typed.
//
// The deny lists are not merely "the keys we forgot to allow": they are checked
// BEFORE the allow-list, so adding `nom` to the allow-list by accident still
// drops it. That inversion is what `redact.test.ts` pins down.
//
// NO framework imports here on purpose (see the module header in `types.ts`).

import type { LogPayload } from './types';

/** Free-text a user typed. Can never be logged, whatever the allow-list says. */
export const USER_TEXT_KEYS: readonly string[] = [
  'nom',
  'name',
  'names',
  'concept',
  'biographie',
  'biography',
  'notes',
  'note',
  'gmNotes',
  'conditions',
  'label',
  'specLabel',
  'skillName',
  'parentName',
  'campaignName',
  'description',
  'text',
  'title',
  'comment',
  'content',
  'message',
  'msg',
  'query',
  'search',
  'input',
  // `effects.target` is `skill:<name>` — a specialization name the player typed.
  'target',
  'value',
  'values',
  'nickname',
  'pseudo',
];

/** Credentials and network identity. Same hard block as the user text. */
export const SECRET_KEYS: readonly string[] = [
  'gmToken',
  'token',
  'code',
  'joinCode',
  'serverUrl',
  'url',
  'password',
  'secret',
  'authorization',
  'apiKey',
  'email',
  'deviceId',
];

/**
 * The only keys ever written. Ids, fixed enums, counters and technical shape —
 * things whose vocabulary is defined by the schema/code, not by the user.
 */
export const ALLOWED_PAYLOAD_KEYS: readonly string[] = [
  // records, by opaque local id only
  'id',
  'ids',
  'characterId',
  'campaignId',
  'skillId',
  'weaponId',
  'armorId',
  'shieldId',
  'itemId',
  'spellId',
  'effectId',
  'reserveId',
  'enchantId',
  'uuid',
  'charUuid',
  'sessionId',
  // technical shape
  'entity',
  'op',
  'table',
  'fields',
  'count',
  'index',
  'length',
  'bytes',
  'durationMs',
  'attempt',
  'status',
  'reason',
  'phase',
  'ok',
  // navigation breadcrumbs (paths carry local ids, no user text)
  'route',
  'from',
  'to',
  'screen',
  'tab',
  // catalogue slug (`boule-de-feu`) — authored in data-src/*.csv and generated
  // into the app, i.e. a code identifier, not anything the user typed. A row id
  // alone says "spell 11 was added" and can't tell a bad preset from a bad edit.
  'catalogId',
  // fixed domain vocabularies
  'kind',
  'role',
  'level',
  'slot',
  'unit',
  'mode',
  'platform',
  'version',
  'schemaVersion',
  // database lifecycle
  'migration',
  'applied',
  'pending',
  'restored',
  'backup',
  // errors (the human text rides in the entry's `err`, not here). A React
  // component stack is a list of component display names — code identifiers.
  'errorName',
  'errorCode',
  'componentStack',
];

/** Longest string kept for a normal value. */
export const MAX_STRING = 400;
/** Longest string kept for a stack trace. */
export const MAX_STACK = 2000;
/** Arrays keep at most this many items (the rest count as dropped). */
export const MAX_ARRAY = 20;
/** How deep the redactor walks a nested payload before giving up. */
export const MAX_DEPTH = 3;

const DENIED = new Set<string>([...USER_TEXT_KEYS, ...SECRET_KEYS].map((k) => k.toLowerCase()));
const ALLOWED = new Set<string>(ALLOWED_PAYLOAD_KEYS);

/**
 * True when a key may be written. Denial wins over the allow-list — this is the
 * invariant the "user-text keys can never be allow-listed" test asserts.
 */
export function isKeyAllowed(key: string): boolean {
  if (DENIED.has(key.toLowerCase())) return false;
  return ALLOWED.has(key);
}

/** Cut a string to `max`, marking the cut so a reader knows it happened. */
export function truncate(s: string, max = MAX_STRING): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…(+${s.length - max})`;
}

export interface RedactResult {
  data: Record<string, unknown>;
  dropped: number;
}

/**
 * Filter a payload down to the allow-list. Returns the surviving fields plus a
 * count of everything removed; `redactPayload` callers merge that count in as
 * `_dropped`. Never throws — a payload that can't be walked yields `{}`.
 */
export function redactPayload(payload: LogPayload | undefined): Record<string, unknown> | undefined {
  if (!payload) return undefined;
  let res: RedactResult;
  try {
    res = redactObject(payload, 0);
  } catch {
    return { _dropped: 1 };
  }
  if (res.dropped > 0) res.data._dropped = res.dropped;
  return Object.keys(res.data).length > 0 ? res.data : undefined;
}

function redactObject(obj: Record<string, unknown>, depth: number): RedactResult {
  const data: Record<string, unknown> = {};
  let dropped = 0;
  for (const [key, raw] of Object.entries(obj)) {
    if (!isKeyAllowed(key)) {
      dropped++;
      continue;
    }
    const v = redactValue(raw, depth);
    if (v === DROP) {
      dropped++;
      continue;
    }
    data[key] = v;
  }
  return { data, dropped };
}

/** Sentinel: this value has no loggable form. */
const DROP = Symbol('drop');

function redactValue(raw: unknown, depth: number): unknown | typeof DROP {
  if (raw === null) return null;
  switch (typeof raw) {
    case 'string':
      return truncate(raw);
    case 'number':
      return Number.isFinite(raw) ? raw : DROP;
    case 'boolean':
      return raw;
    case 'undefined':
    case 'function':
    case 'symbol':
    case 'bigint':
      return DROP;
  }
  if (depth >= MAX_DEPTH) return DROP;
  if (Array.isArray(raw)) {
    const out: unknown[] = [];
    for (const item of raw.slice(0, MAX_ARRAY)) {
      const v = redactValue(item, depth + 1);
      // A dropped item still occupies a slot: keep the array's shape honest.
      out.push(v === DROP ? null : v);
    }
    if (raw.length > MAX_ARRAY) out.push(`…(+${raw.length - MAX_ARRAY})`);
    return out;
  }
  if (raw instanceof Date) return raw.toISOString();
  // A plain nested object is walked with the same allow-list; anything exotic
  // (class instance, Map, …) is dropped rather than stringified blindly.
  if (Object.getPrototypeOf(raw) === Object.prototype || Object.getPrototypeOf(raw) === null) {
    const nested = redactObject(raw as Record<string, unknown>, depth + 1);
    if (nested.dropped > 0) nested.data._dropped = nested.dropped;
    return Object.keys(nested.data).length > 0 ? nested.data : DROP;
  }
  return DROP;
}

/**
 * Normalize a thrown value into the entry's `err` field. The message and stack
 * come from the runtime, not from a form field, but they are still truncated —
 * a SQLite constraint error can quote a value, and a stack can be huge.
 */
export function redactError(e: unknown): { name: string; message: string; stack?: string } {
  if (e instanceof Error) {
    return {
      name: truncate(e.name || 'Error', 80),
      message: truncate(e.message ?? ''),
      stack: e.stack ? truncate(e.stack, MAX_STACK) : undefined,
    };
  }
  return { name: 'NonError', message: truncate(safeString(e)) };
}

function safeString(v: unknown): string {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return '[unserializable]';
  }
}
