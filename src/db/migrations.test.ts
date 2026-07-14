import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

// Forward-migration harness. The app ships bundled `drizzle/*.sql` migrations
// and applies them on-device with `useMigrations`. A tester upgrading the app
// runs the NEW migrations against a DB seeded at an OLD schema version — the
// exact case that trips a NOT NULL column added without a default, a tightened
// CHECK against existing rows, or a journal/snapshot mismatch. expo-sqlite can't
// run under Node, but the generated SQL is portable, so we replay it against
// better-sqlite3 (same SQLite engine) here.

const DRIZZLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

type JournalEntry = { idx: number; tag: string };

function loadJournal(): JournalEntry[] {
  const journal = JSON.parse(readFileSync(join(DRIZZLE_DIR, 'meta/_journal.json'), 'utf8'));
  return [...journal.entries].sort((a: JournalEntry, b: JournalEntry) => a.idx - b.idx);
}

/** Statements of one migration, split on drizzle's breakpoint marker. */
function migrationStatements(tag: string): string[] {
  return readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), 'utf8')
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
}

function applyMigration(db: Database.Database, tag: string): void {
  for (const stmt of migrationStatements(tag)) db.exec(stmt);
}

// Every table a character owns. Child tables carry a NOT NULL `character_id`
// with no default; the `characters`/`actual_state`/`effects` timestamp columns
// use a drizzle `$defaultFn` (no SQL default) so they must be supplied too.
const CHILD_TABLES = ['actual_state', 'skills', 'armor', 'weapons', 'spells', 'effects'];

type ColumnInfo = { name: string; type: string; notnull: number; dflt_value: unknown; pk: number };

/**
 * Insert a minimal valid row, supplying a value for every column that is NOT
 * NULL, has no SQL default, and isn't the autoincrement PK (i.e. the ones an
 * `INSERT … DEFAULT VALUES` would choke on — FKs and the `$defaultFn` timestamp
 * columns). Schema-driven so it works at any version and survives new columns.
 */
function seedRow(db: Database.Database, table: string, characterId?: number): void {
  const cols = db.prepare(`PRAGMA table_info("${table}")`).all() as ColumnInfo[];
  const needed = cols.filter((c) => c.notnull === 1 && c.dflt_value === null && c.pk === 0);
  if (needed.length === 0) {
    db.prepare(`INSERT INTO "${table}" DEFAULT VALUES`).run();
    return;
  }
  const values = needed.map((c) => {
    if (c.name === 'character_id') return characterId ?? 0;
    return /INT/i.test(c.type) ? 0 : '';
  });
  const colList = needed.map((c) => `"${c.name}"`).join(', ');
  const placeholders = needed.map(() => '?').join(', ');
  db.prepare(`INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`).run(...values);
}

/**
 * Seed one row into every table that exists at the current schema version, so
 * the following migration runs against NON-EMPTY tables. Tables absent at this
 * version throw on insert and are skipped.
 */
function seed(db: Database.Database): void {
  seedRow(db, 'characters');
  const { id } = db.prepare('SELECT id FROM characters ORDER BY id DESC LIMIT 1').get() as {
    id: number;
  };
  for (const table of CHILD_TABLES) {
    try {
      seedRow(db, table, id);
    } catch {
      // table doesn't exist at this version yet — nothing to seed
    }
  }
}

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}

function tableNames(db: Database.Database): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  ).map((r) => r.name);
}

const ENTRIES = loadJournal();
const EXPECTED_TABLES = ['characters', 'actual_state', 'skills', 'armor', 'weapons', 'spells', 'effects'];

describe('drizzle journal integrity', () => {
  it('has a .sql file for every journal entry', () => {
    for (const e of ENTRIES) {
      expect(() => migrationStatements(e.tag), `missing ${e.tag}.sql`).not.toThrow();
    }
  });

  it('has no orphan .sql migration outside the journal', () => {
    const sqlTags = readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => f.replace(/\.sql$/, ''))
      .sort();
    const journalTags = ENTRIES.map((e) => e.tag).sort();
    expect(sqlTags).toEqual(journalTags);
  });

  it('indices are contiguous from 0', () => {
    expect(ENTRIES.map((e) => e.idx)).toEqual(ENTRIES.map((_, i) => i));
  });
});

describe('forward migration', () => {
  it('applies the full chain from an empty database', () => {
    const db = freshDb();
    try {
      for (const e of ENTRIES) applyMigration(db, e.tag);
      expect(tableNames(db)).toEqual(expect.arrayContaining(EXPECTED_TABLES));
    } finally {
      db.close();
    }
  });

  // The core guard: seed at version k, then run every remaining migration.
  for (let k = 0; k < ENTRIES.length - 1; k++) {
    const upto = ENTRIES[k].tag;
    const next = ENTRIES[k + 1].tag;
    it(`migrates a DB seeded at ${upto} up through ${ENTRIES[ENTRIES.length - 1].tag}`, () => {
      const db = freshDb();
      try {
        for (let i = 0; i <= k; i++) applyMigration(db, ENTRIES[i].tag);
        seed(db);
        expect(() => {
          for (let i = k + 1; i < ENTRIES.length; i++) applyMigration(db, ENTRIES[i].tag);
        }, `failed applying ${next}…`).not.toThrow();
      } finally {
        db.close();
      }
    });
  }

  it('keeps the seeded row after the egratignure rename (0004)', () => {
    // A regression guard for column-rename migrations: existing data must carry
    // across, not get dropped/nulled.
    const db = freshDb();
    try {
      const renameIdx = ENTRIES.findIndex((e) => e.tag === '0004_fix_egratignure');
      expect(renameIdx).toBeGreaterThan(0);
      for (let i = 0; i < renameIdx; i++) applyMigration(db, ENTRIES[i].tag);
      seed(db);
      for (let i = renameIdx; i < ENTRIES.length; i++) applyMigration(db, ENTRIES[i].tag);
      const count = db.prepare('SELECT COUNT(*) AS n FROM characters').get() as { n: number };
      expect(count.n).toBe(1);
      // The renamed column exists and is readable on the surviving row.
      expect(() => db.prepare('SELECT egratignure_max FROM characters').get()).not.toThrow();
    } finally {
      db.close();
    }
  });
});
