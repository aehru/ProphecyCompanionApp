// The single database connection, exposed to the app as a Drizzle instance.
//
// The driver is `sqlite-proxy` (async) rather than `drizzle-orm/expo-sqlite`
// (sync), because expo-sqlite's SYNC API only exists on web through a
// SharedArrayBuffer + busy-spin bridge: it needs the page to be cross-origin
// isolated (COOP/COEP), and its very first call times out while the worker is
// still fetching/compiling the wasm. The async API is plain postMessage — it
// works on web with no special headers — so going async everywhere buys the web
// (and therefore desktop) target with ONE code path instead of a per-platform
// fork. Native loses nothing but a promise hop.
//
// Consequences, both good: `db.transaction()` now takes an `async` callback and
// really awaits it (the sync driver committed as soon as the callback returned),
// and every query must be awaited for real. See the `transaction` helper below
// for the one thing async transactions need that sync ones did not.

import { drizzle } from 'drizzle-orm/sqlite-proxy';
import {
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteBindValue,
  type SQLiteDatabase,
} from 'expo-sqlite';

import { backupDatabase } from './backup';
import { DATABASE_NAME } from './database-name';
import * as schema from './schema';

export { DATABASE_NAME };

let handle: Promise<SQLiteDatabase> | null = null;
let closing: Promise<void> | null = null;

/**
 * Open (once) the app's connection. `enableChangeListener` powers Drizzle's
 * `useLiveQuery` reactivity — it fires over postMessage on web too.
 *
 * The pre-migration snapshot is taken inside this promise, so it always lands
 * before the first query resolves — migrations included — without any caller
 * having to sequence it. Best-effort: a failed snapshot never blocks the open.
 */
export async function connection(): Promise<SQLiteDatabase> {
  // A close in flight has to finish first. The restore path deletes the database
  // file and copies a snapshot over it; a connection opened underneath that would
  // be writing into a file that is being replaced.
  while (closing) await closing;

  if (!handle) {
    const open = (async () => {
      const conn = await openDatabaseAsync(DATABASE_NAME, { enableChangeListener: true });
      await backupDatabase(conn);
      return conn;
    })();
    handle = open;
    // A FAILED open must not be cached. Web opens the database through OPFS sync
    // access handles, which are exclusive per file: a second tab cannot open it.
    // Keeping the rejected promise would replay that failure for the lifetime of
    // the page, so the tab would stay dead even after the other one closed.
    void open.catch(() => {
      if (handle === open) handle = null;
    });
  }
  return handle;
}

/** Execute one statement on the connection, with no queueing of any kind. */
async function execute(
  sqlText: string,
  params: unknown[],
  method: 'run' | 'all' | 'values' | 'get',
): Promise<{ rows: any[] }> {
  const conn = await connection();
  const bind = params as SQLiteBindValue[];

  // `run` has no result to map — drizzle only reads `rows` for the other three.
  if (method === 'run') {
    await conn.runAsync(sqlText, bind);
    return { rows: [] };
  }

  // Drizzle maps result rows POSITIONALLY (mapResultRow walks the selected
  // fields in order), so the raw variant is required — `getAllAsync` would
  // hand back objects and every column would land as undefined.
  const stmt = await conn.prepareAsync(sqlText);
  try {
    const result = await stmt.executeForRawResultAsync(bind);
    const rows = (await result.getAllAsync()) as unknown[][];
    // `get` wants the row itself (undefined when there is none), not a list.
    return { rows: method === 'get' ? (rows[0] as unknown as unknown[]) : rows };
  } finally {
    await stmt.finalizeAsync();
  }
}

// Everything the app runs goes through ONE connection, and a transaction on that
// connection is just `BEGIN` … `COMMIT` sent as separate statements. So any query
// issued while a transaction is open joins it — and is rolled back with it. The
// sync driver could not hit this (a whole transaction ran in one uninterrupted
// tick); this queue restores the guarantee.
let chain: Promise<unknown> = Promise.resolve();

/** Run `fn` once every previously queued unit of work has finished. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  // Settled either way: one caller's failure must not stall the queue.
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * The app-facing database. Every statement takes its turn in the queue, so a
 * plain `db.update(...)` can never land inside someone else's transaction.
 */
export const db = drizzle((sqlText, params, method) => enqueue(() => execute(sqlText, params, method)), {
  schema,
});

/**
 * A second Drizzle instance over the SAME connection that bypasses the queue.
 * Reserved for the body of `transaction()`, which already holds the queue for
 * its whole duration — routing its own statements through the queue again would
 * deadlock, and telling them apart from other callers' is not possible inside a
 * single client function.
 */
const dbDirect = drizzle(execute, { schema });

/** The transaction handle handed to a `transaction()` body. */
export type Tx = Parameters<Parameters<typeof dbDirect.transaction>[0]>[0];

/**
 * Run `body` in a transaction that owns the connection for its whole duration:
 * it takes the queue once, and its own statements go straight through on
 * `dbDirect`. Nothing else can slip between the BEGIN and the COMMIT, so a
 * rollback can only ever undo this body's writes.
 *
 * ALWAYS use this instead of `db.transaction` directly — that one would take the
 * queue per statement and deadlock against itself.
 */
export function transaction<T>(body: (tx: Tx) => Promise<T>): Promise<T> {
  return enqueue(() => dbDirect.transaction(body));
}

/**
 * Close the connection. Callers that then touch the DB FILE (restore) must do
 * this first; the next `connection()` reopens on whatever is on disk.
 *
 * `connection()` waits on the close rather than racing it, so nothing can reopen
 * the file while a restore is swapping it.
 */
export async function closeConnection(): Promise<void> {
  const open = handle;
  handle = null;
  if (!open) return;

  const done = (async () => {
    try {
      await (await open).closeAsync();
    } catch {
      // already closed / never opened — ignore
    }
  })();
  closing = done;
  try {
    await done;
  } finally {
    if (closing === done) closing = null;
  }
}

/** Close + delete the DB (used to auto-heal a failed/stale migration in dev). */
export async function resetDatabase(): Promise<void> {
  await closeConnection();
  try {
    await deleteDatabaseAsync(DATABASE_NAME);
  } catch {
    // not present — ignore
  }
}
