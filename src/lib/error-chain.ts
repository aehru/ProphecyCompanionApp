// Reading a thrown value's `cause` chain.
//
// Written because a real failure went unreadable: Drizzle wraps every query
// error in a `DrizzleQueryError` whose message is `Failed query: <the SQL>` and
// whose ACTUAL reason — the SQLite/driver error — sits in `cause`. Showing only
// `error.message` therefore hands the user the statement and hides the problem,
// on the fatal screen and in the shared diagnostic report alike.
//
// Pure — no framework imports, so `log/redact` can use it (see that module's
// note) and so it loads in plain-Node vitest.

/** Stop after this many links; a cycle or a deep wrap must not hang the caller. */
const MAX_LINKS = 4;

function describe(e: unknown): string {
  if (e instanceof Error) {
    const name = e.name || 'Error';
    return e.message ? `${name}: ${e.message}` : name;
  }
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return String(e);
  }
}

/**
 * The `cause` chain BELOW `e`, nearest first, each as `Name: message`. Empty
 * when nothing was wrapped. `e` itself is not included — callers already have
 * its message and only need what it was hiding.
 */
export function causeChain(e: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = e;
  while (out.length < MAX_LINKS) {
    if (typeof current !== 'object' || current === null) break;
    if (seen.has(current)) break;
    seen.add(current);
    const cause = (current as { cause?: unknown }).cause;
    if (cause === undefined || cause === null) break;
    out.push(describe(cause));
    current = cause;
  }
  return out;
}

/**
 * A thrown value as one readable line: its own description followed by whatever
 * it was wrapping. This is what a user should see when something fails — the
 * outer message alone can be pure ceremony.
 */
export function describeError(e: unknown): string {
  return [describe(e), ...causeChain(e)].join('\n↳ ');
}
