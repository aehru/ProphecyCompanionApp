# Roadmap

Planned work. See [DEV.md](DEV.md) for current architecture.

## Data safety

Local-only app, no cloud, no backup — losing the SQLite DB means losing every character. These items harden that.

- [ ] **Back up before migrating.** Copy `prophecy.db` → `prophecy.db.bak` before `useMigrations` runs; restore the backup on failure instead of deleting. Lets a failed prod migration recover instead of dead-ending on the error screen.
- [ ] **Export / import characters.** User-facing backup (JSON or file share). Covers device loss and migration failures, and lets players move characters between devices.
- [ ] **Production migration-failure UX.** Replace the bare error screen with actionable options: retry, restore backup, export-then-reset. Avoid leaving the user stuck.

## Migration process

- [ ] **Forward-migration tests.** Seed a DB at each prior schema version, run the new migration, assert success. Catches conflict cases (NOT NULL without default, CHECK violations against existing rows, journal/snapshot mismatch) before release.
- [ ] **Migration authoring guidelines.** Document the safe-change rules in DEV.md: additive columns with defaults, avoid tightening constraints on existing columns, never hand-edit `drizzle/` artifacts.
- [ ] **Add a `db:generate` script** to `package.json` wrapping `drizzle-kit generate` (currently a bare `bunx` command).

## Game content

- [ ] **Manage spells**
- [ ] **Money**
