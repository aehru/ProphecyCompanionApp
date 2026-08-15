// Migration hook, wrapping Drizzle's expo-sqlite one.
//
// We run the async `sqlite-proxy` driver (see db/client), but Drizzle's proxy
// migrator is Node-only — it calls `readMigrationFiles`, which reads the drizzle
// folder off the filesystem. The expo-sqlite migrator is the one that takes the
// migrations BUNDLED by `drizzle/migrations.js`, which is what ships in the app.
//
// That hook is driver-agnostic at runtime: it imports nothing but React, and its
// whole body is `db.dialect.migrate(migrations, db.session)`. Our dialect is
// `SQLiteAsyncDialect`, whose `migrate` is async and only uses
// `session.run/values/transaction` — all present on the proxy session. Its
// SIGNATURE, though, is pinned to `ExpoSQLiteDatabase` (a `'sync'` result kind),
// so the async db does not typecheck against it. Hence the single cast here,
// kept in one file instead of sprinkled at the call site.

import { useMigrations as useExpoMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import type { db } from './client';

type BundledMigrations = Parameters<typeof useExpoMigrations>[1];

export function useMigrations(database: typeof db, migrations: BundledMigrations) {
  return useExpoMigrations(database as never, migrations);
}
