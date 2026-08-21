/**
 * The on-disk database filename, in its own module so `db/backup` can name the
 * file without importing `db/client` — the client opens the connection AND runs
 * the pre-migration snapshot through backup, so the dependency only goes one way.
 */
export const DATABASE_NAME = 'prophecy.db';
