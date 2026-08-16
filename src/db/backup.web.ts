// Web stand-in for db/backup — deliberately all no-ops.
//
// The snapshot is a FILE operation: `VACUUM INTO` needs a real OS path, and the
// restore is a copy back over the live file. Neither exists on web, where the
// database lives in OPFS behind the wasm worker and `expo-file-system` only
// warns ("not supported on web") before throwing. Since `db/client` takes the
// snapshot on every connection open, letting those calls fall through meant a
// warning on every launch, on the way to an exception the caller swallows.
//
// So the web build says so plainly instead: there is no pre-migration snapshot
// on web yet. A real one means serialising the DB out through the worker and
// storing the bytes where the user can get at them — not built. Until then a
// failed web migration has nothing to roll back to.
//
// Keep these signatures in step with ./backup.

import type { SQLiteDatabase } from 'expo-sqlite';

/** Always false — no snapshot is ever written on web. */
export function hasBackup(): boolean {
  return false;
}

/** No-op. Returning false is the same "no snapshot available" the native path reports when `VACUUM INTO` fails. */
export async function backupDatabase(_conn: SQLiteDatabase): Promise<boolean> {
  return false;
}

/** No-op — there is never anything to restore. */
export function restoreDatabase(): boolean {
  return false;
}

/** No-op — there is never anything to drop. */
export function clearBackup(): void {}
