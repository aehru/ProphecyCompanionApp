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
- [x] **Armor & shield catalogues.** Armor gained weapon-level fields (category, prerequisites, creation, encombrement) and a real catalogue picker (was a blank-only inline editor). Shields added end-to-end: table, catalogue, editor/card, independent equip slot, enchant target, export/import. `data-src/armor.csv` / `shield.csv` are seeded with real rulebook rows; extend them as more gear is added.
- [ ] **Wire `encombrementMalus` into rolls.** Currently stored/displayed only — not folded into `lib/modifiers` like the wound malus is.

## Campaign mode

A GM's table is local-first (NPCs, sheets, initiative — no network); the relay
server (see [docs/campaign-protocol.md](docs/campaign-protocol.md)) is the
optional bonus that adds the players' characters. Shipped: DB tables, wire
protocol + socket client, app-level live-broadcast provider, local+remote roster
merge, character detail sheet, join disclaimer, privacy policy.

- [x] **Local-first table (phase 1).** `createLocalTable` (no server, no code),
  `attachServer` later; roster = `mergeRoster(local, remote)` with the local
  entry winning; `characters.kind` PC/NPC + "Nouveau PNJ" straight from the
  salon; GM NPCs no longer round-trip through the server (`campaigns.share_npcs`,
  off by default).
- [x] **Phase 2 — full local NPC sheet.** The GM sheet renders the local rows
  for its own NPCs on top of the projection: armes (damage formulas resolved
  with the wound/effects modifier), armures, boucliers, sorts. Remote players
  stay projection-limited by protocol.
- [ ] **Phase 3 — co-GM.** `share_npcs` publishes the NPCs already; a second GM
  seat needs server-side work (a second gmToken, ownership rules).
- [ ] **Phase 4 — docs.** `docs/campaign-protocol.md` still describes the roster
  as server-sourced; PRIVACY.md should say a GM table with no server attached is
  fully local.

- [x] **Ghost roster entry when a player switches shared character while live.**
  Fixed by protocol v2 (multi-share): the broadcaster
  ([src/hooks/use-campaign-live.tsx](src/hooks/use-campaign-live.tsx)) diffs the
  shared set on every run (`diffShares`) and sends `unshare` for removed uuids
  on the live socket; unchecking while paused purges via
  `unshareFromServer` ([src/repositories/campaigns.ts](src/repositories/campaigns.ts)).
- [ ] **GM device holds two sockets while broadcasting PNJs.** The screen-scoped
  roster socket ([src/hooks/use-gm-roster.ts](src/hooks/use-gm-roster.ts), via
  `GmRosterProvider`) and the app-level live-broadcast socket
  ([src/hooks/use-campaign-live.tsx](src/hooks/use-campaign-live.tsx)) both
  connect with the gmToken, so the server fans every roster/update frame out to
  both — harmless duplicate traffic on a private server, but wasteful. _Fix
  later:_ merge them (one GM socket serving both the roster UI and the PNJ
  broadcast), or teach the broadcaster to feed the roster context.
- [ ] **Auto-resume broadcasts on launch** (current behaviour, by choice): the
  app reconnects and pushes on startup if it was live. Revisit if a "start
  paused, confirm to resume" step is wanted for privacy.
