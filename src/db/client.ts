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

/**
 * Open (once) the app's connection. `enableChangeListener` powers Drizzle's
 * `useLiveQuery` reactivity — it fires over postMessage on web too.
 *
 * The pre-migration snapshot is taken inside this promise, so it always lands
 * before the first query resolves — migrations included — without any caller
 * having to sequence it. Best-effort: a failed snapshot never blocks the open.
 */
export function connection(): Promise<SQLiteDatabase> {
  handle ??= (async () => {
    const conn = await openDatabaseAsync(DATABASE_NAME, { enableChangeListener: true });
    await backupDatabase(conn);
    return conn;
  })();
  return handle;
}

export const db = drizzle(
  async (sqlText, params, method) => {
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
  },
  { schema },
);

/** The transaction handle handed to a `transaction()` body. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// An async transaction is BEGIN / … / COMMIT sent as separate statements over
// one connection, so two overlapping callers would nest their BEGINs and SQLite
// would reject the inner one. The sync driver could not hit this (its whole
// transaction ran in one uninterrupted tick); this queue restores that
// guarantee by serializing transactions app-wide.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Run `body` in a transaction, serialized against every other `transaction()`
 * call. ALWAYS use this instead of `db.transaction` directly.
 */
export function transaction<T>(body: (tx: Tx) => Promise<T>): Promise<T> {
  const run = queue.then(() => db.transaction(body));
  // Keep the chain alive after a failed transaction — the rejection belongs to
  // the caller, not to the next one in line.
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Close the connection. Callers that then touch the DB FILE (restore) must do
 * this first; the next `connection()` reopens on whatever is on disk.
 */
export async function closeConnection(): Promise<void> {
  const open = handle;
  handle = null;
  if (!open) return;
  try {
    await (await open).closeAsync();
  } catch {
    // already closed / never opened — ignore
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
