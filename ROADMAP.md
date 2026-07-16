# Roadmap

Planned work. See [DEV.md](DEV.md) for current architecture.

## Data safety

Local-only app, no cloud, no backup — losing the SQLite DB means losing every character. These items harden that.

- [x] **Back up before migrating.** Snapshots `prophecy.db` → `prophecy.db.bak` (via `VACUUM INTO`) before `useMigrations` runs; prod restores it on failure instead of wiping, and drops it on success. See [src/db/backup.ts](src/db/backup.ts).
- [x] **Export / import characters.** Versioned JSON export (share sheet) + import (document picker); adds imported characters as new entries. Pure serialize/validate core is unit-tested. _Media (avatar/portrait) not embedded yet — a future version can base64-embed them._
- [ ] **Production migration-failure UX.** Replace the bare error screen with actionable options: retry, restore backup, export-then-reset. Avoid leaving the user stuck.

## Migration process

- [x] **Forward-migration tests.** Seeds a DB at each prior schema version and replays the remaining `drizzle/*.sql` against better-sqlite3, asserting success. Catches NOT-NULL-without-default, CHECK violations against existing rows, and journal/`.sql` drift. See [src/db/migrations.test.ts](src/db/migrations.test.ts).
- [ ] **Migration authoring guidelines.** Document the safe-change rules in DEV.md: additive columns with defaults, avoid tightening constraints on existing columns, never hand-edit `drizzle/` artifacts.
- [ ] **Add a `db:generate` script** to `package.json` wrapping `drizzle-kit generate` (currently a bare `bunx` command).

## Game content

- [x] **Manage spells** — spellbook with catalogue + editor, disciplines, reserve & spheres.
- [x] **Money** — the four Drac coins tracked on the sheet.

## Campaign mode

Live GM/player campaigns via a self-hostable relay server (see
[docs/campaign-protocol.md](docs/campaign-protocol.md)). Shipped: DB tables,
wire protocol + socket client, app-level live-broadcast provider, GM roster +
character detail sheet, join disclaimer, privacy policy.

- [ ] **Ghost roster entry when a player switches shared character while live.**
  The live broadcaster ([src/hooks/use-campaign-live.tsx](src/hooks/use-campaign-live.tsx))
  keys its socket on the shared character's `charUuid`. Changing the shared
  character in [src/app/campaigns/[id].tsx](src/app/campaigns/[id].tsx) (the
  radio picker → `setShared`) makes the provider's live queries resolve a new
  `characterId`/`charUuid`, so the socket effect tears down and reconnects for
  the new character. But **stop = pause**: the old socket closes WITHOUT sending
  `unshare`, so the previous character's projection stays on the server and the
  GM keeps seeing it as a stale roster card — a "ghost" — until the player
  leaves the campaign (which purges) or the server's idle-retention reaps it.
  _Fix:_ when the shared `charUuid` changes while live (not on a normal stop),
  send `unshare` for the OUTGOING uuid before switching. Distinguish
  "switching character" from "pausing/leaving" in the provider's socket-cleanup
  path — e.g. track the previous uuid in a ref and, if the campaign is still
  live but the uuid changed, fire `unshareMsg(previousUuid)` on the still-open
  (old) socket before it closes. Add a test once the repo layer is DI-testable.
- [ ] **Auto-resume broadcasts on launch** (current behaviour, by choice): the
  app reconnects and pushes on startup if it was live. Revisit if a "start
  paused, confirm to resume" step is wanted for privacy.
