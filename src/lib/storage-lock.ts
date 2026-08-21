// Recognising "another window already holds the database".
//
// On web, expo-sqlite keeps the database in OPFS through wa-sqlite's
// `AccessHandlePoolVFS`, which grabs a pool of SYNC ACCESS HANDLES when it
// initialises and holds them for the page's whole life. Those handles are
// EXCLUSIVE per file per origin, so a second context on the same origin — the
// installed PWA next to a still-open browser tab, two tabs, a desktop shell —
// cannot open the database at all. The browser refuses with a
// `NoModificationAllowedError`.
//
// That is not a corrupt database and must never be treated as one: nothing was
// opened, so nothing was migrated, so there is nothing to restore or reset.
// Telling the two apart is this module's whole job.
//
// Matching on TEXT rather than on `instanceof DOMException` is deliberate:
// - a DOMException is NOT an `Error` subclass in browsers, and it does not
//   exist at all in the Node test environment;
// - by the time the failure reaches us it has crossed expo-sqlite's worker
//   channel (which reduces it to a plain object carrying the name) and usually a
//   Drizzle wrapper (`Failed query: …`, real reason in `cause`).
//
// Pure — no framework imports, so it loads in plain-Node vitest.

/** Stop after this many links; a cycle or a deep wrap must not hang the caller. */
const MAX_LINKS = 5;

// Matches both spellings we can receive: the DOMException NAME
// (`NoModificationAllowedError`) and its MESSAGE (`No modification allowed`).
const LOCK_MARKER = /no\s*modification\s*allowed/i;

/**
 * A thrown value's name + message, whatever its class — `instanceof Error`
 * cannot be the test here (see the note above).
 */
function nameAndMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (typeof e !== 'object' || e === null) return '';
  const { name, message } = e as { name?: unknown; message?: unknown };
  const parts = [name, message].filter((p): p is string => typeof p === 'string');
  return parts.join(' ');
}

/**
 * True when `error` — or anything it wraps — is the browser refusing the
 * exclusive OPFS lock because another window of the same origin holds it.
 * Always false on native, which has no such lock.
 */
export function isStorageLockError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let i = 0; i < MAX_LINKS; i++) {
    if (LOCK_MARKER.test(nameAndMessage(current))) return true;
    if (typeof current !== 'object' || current === null) break;
    if (seen.has(current)) break;
    seen.add(current);
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
