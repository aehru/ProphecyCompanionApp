// Pre-migration database backup / restore.
//
// The app is local-only with no cloud copy, so a failed schema migration must
// not dead-end on a broken DB. Before migrations run we snapshot the DB to a
// `.bak` sibling; on a migration failure we restore that snapshot so the user's
// characters survive (see app/_layout). On success the snapshot is dropped.
//
// The snapshot uses `VACUUM INTO`, which writes a single, consistent copy of the
// committed database regardless of WAL state — no `-wal` / `-shm` sidecars to
// juggle. Restore is a plain file copy back over the (closed) live DB; the
// caller reloads the app afterwards so the connection reopens on the good file.

import { File } from 'expo-file-system';
import { defaultDatabaseDirectory, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME } from './database-name';

// `defaultDatabaseDirectory` is a plain OS path (e.g. /data/.../files/SQLite).
// SQLite's VACUUM INTO wants that raw path; the expo-file-system File API wants
// a file:// uri — so we keep both forms.
const DIR = defaultDatabaseDirectory as string;
const BAK_NAME = `${DATABASE_NAME}.bak`;

/** Raw OS path for the backup file (VACUUM INTO target). */
const bakFsPath = `${DIR}/${BAK_NAME}`;

/** File-API handles (file:// uris) for existence / copy / delete. */
const dirUri = `file://${DIR}`;
const fileIn = (name: string) => new File(dirUri, name);

/** True if a pre-migration snapshot is currently on disk. */
export function hasBackup(): boolean {
  try {
    return fileIn(BAK_NAME).exists;
  } catch {
    return false;
  }
}

/**
 * Snapshot the live DB to its `.bak` sibling. Takes the raw connection rather
 * than reaching for the `db/client` singleton, so `client` can call this while
 * it is still opening (that is what guarantees the snapshot precedes the first
 * query). Best-effort: returns false (and swallows) on any failure — a missing
 * backup only means the restore path is unavailable, it must never block the
 * migration itself. On web `expo-file-system` is unavailable, so this always
 * returns false there.
 */
export async function backupDatabase(conn: SQLiteDatabase): Promise<boolean> {
  try {
    const bak = fileIn(BAK_NAME);
    // VACUUM INTO refuses to overwrite, so clear any stale snapshot first.
    if (bak.exists) bak.delete();
    // Single quotes doubled per SQL string-literal escaping.
    await conn.execAsync(`VACUUM INTO '${bakFsPath.replace(/'/g, "''")}'`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore the `.bak` snapshot over the live DB after a failed migration: removes
 * the (possibly half-migrated) DB + its WAL sidecars, then copies the snapshot
 * back. The caller MUST have closed the connection first (`closeConnection` in
 * db/client) and MUST reload the app afterwards, so the connection reopens on
 * the restored file. Returns false if there was no backup to restore.
 */
export function restoreDatabase(): boolean {
  if (!hasBackup()) return false;
  // Drop the live DB and any WAL/SHM sidecars so a stale WAL can't replay over
  // the restored snapshot.
  for (const name of [DATABASE_NAME, `${DATABASE_NAME}-wal`, `${DATABASE_NAME}-shm`]) {
    try {
      const f = fileIn(name);
      if (f.exists) f.delete();
    } catch {
      // not present — ignore
    }
  }
  try {
    fileIn(BAK_NAME).copy(fileIn(DATABASE_NAME));
    return true;
  } catch {
    return false;
  }
}

/** Drop the snapshot once a migration has succeeded. */
export function clearBackup(): void {
  try {
    const bak = fileIn(BAK_NAME);
    if (bak.exists) bak.delete();
  } catch {
    // already gone — ignore
  }
}
