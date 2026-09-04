// A real database for repository tests, in plain Node.
//
// `db/client` opens expo-sqlite, which does not exist under Node — so a
// repository has never been testable. The sqlite-proxy switch is what makes it
// possible: the driver is ONE async `(sql, params, method)` callback, so
// pointing that callback at better-sqlite3 is the whole of the injection. The
// schema comes from the shipped `drizzle/*.sql` migrations, replayed the way
// `db/migrations.test.ts` already replays them, so a test can never drift from
// the schema the app actually runs.
//
// Test-only, and imported only from `*.test.ts`. It lives beside the
// repositories rather than in `lib/` because it is scaffolding, not an engine.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import * as schema from '@/db/schema';

const DRIZZLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

type JournalEntry = { idx: number; tag: string };

/** Every migration, in order — the same chain a device applies. */
function migrationTags(): string[] {
  const journal = JSON.parse(readFileSync(join(DRIZZLE_DIR, 'meta/_journal.json'), 'utf8'));
  return [...journal.entries]
    .sort((a: JournalEntry, b: JournalEntry) => a.idx - b.idx)
    .map((e: JournalEntry) => e.tag);
}

export interface TestDb {
  /** Drizzle instance over the in-memory database. */
  db: ReturnType<typeof drizzle<typeof schema>>;
  /** `transaction()` with the same contract as db/client's. */
  transaction: <T>(body: (tx: any) => Promise<T>) => Promise<T>;
  /** The raw handle, for assertions the ORM makes awkward. */
  raw: Database.Database;
  close: () => void;
}

/**
 * A migrated, empty database.
 *
 * Foreign keys are ON — better-sqlite3 leaves them off by default, and half of
 * what these tests check (cascade on character delete, `on delete set null` for
 * an enchant's source spell) is invisible without them.
 */
export function createTestDb(): TestDb {
  const raw = new Database(':memory:');
  raw.pragma('foreign_keys = ON');
  for (const tag of migrationTags()) {
    for (const stmt of readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), 'utf8')
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)) {
      raw.exec(stmt);
    }
  }

  // The one callback the whole driver is. Drizzle maps result rows POSITIONALLY,
  // so `raw: true` is required here for exactly the reason db/client uses
  // `executeForRawResultAsync` — objects would land every column as undefined.
  const execute = async (sqlText: string, params: unknown[], method: string) => {
    const stmt = raw.prepare(sqlText);
    if (method === 'run' || !stmt.reader) {
      stmt.run(params as never[]);
      return { rows: [] };
    }
    const rows = stmt.raw().all(params as never[]) as unknown[][];
    return { rows: method === 'get' ? ((rows[0] ?? []) as unknown[]) : rows };
  };

  const db = drizzle(execute, { schema });
  // better-sqlite3 is synchronous, so nothing can interleave between the BEGIN
  // and the COMMIT — the app's queue exists to buy that on a real async
  // connection, and there is nothing here for it to serialize.
  const transaction = <T,>(body: (tx: any) => Promise<T>): Promise<T> => db.transaction(body as never);

  return { db, transaction, raw, close: () => raw.close() };
}
