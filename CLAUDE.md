# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Mobile companion app (Expo, iOS/Android) for the French tabletop RPG **Prophecy 2e**. **Solo use is local-only** (SQLite on device, no account, no network); the **optional campaign mode** is the one exception — see the Campaign mode section below. UI is in **French**. See [README.md](README.md) for the feature tour, [DEV.md](DEV.md) for the contributor guide.

## Commands

```bash
bun install                       # setup (bun only — never npm)
bun run start                     # Metro
bun run android | ios | web       # build/launch (first native build is slow)
bun run test                      # vitest run (all)
bun run test:watch                # vitest watch
bunx vitest run src/lib/formula.test.ts          # single file
bunx vitest run -t "woundMalus"                  # single test by name
bunx tsc --noEmit                 # typecheck (the real gate — see lint note)
bunx drizzle-kit generate         # regenerate migrations after editing schema.ts
bun run build:catalogs            # data-src/*.csv → src/data/*-catalog.gen.ts (after ANY CSV edit)
bun run check:catalogs            # verify the .gen files match the CSV (no write)
```

Native modules (`expo-sqlite`, etc.) mean **Expo Go won't work** — a dev build is required. Adding a new native dep requires a dev-client rebuild (`bun run android`/`ios`).

`bun run lint` (`expo lint`) runs ESLint 9 flat config ([eslint.config.js](eslint.config.js), built on `eslint-config-expo/flat`); `tsc --noEmit` stays the type gate. **ajv trap:** `@eslint/eslintrc` needs ajv 6 but `expo-dev-launcher` pulls ajv 8 — the committed `bun.lock` pins ajv 6 at top with ajv 8 nested. Regenerating the lockfile can re-hoist ajv 8 and make ESLint crash at load (`Cannot set properties of undefined (setting 'defaultMeta')`); if that happens, ensure `node_modules/ajv` is 6.x and expo-dev-launcher has a nested 8.x.

## Architecture

**Stack:** Expo SDK 54 + expo-router (file-based routes under `src/app`, typed routes on), RN 0.81 / React 19, react-native-paper (Material 3), Drizzle ORM over expo-sqlite. React Compiler is on — avoid manual memo hacks that fight it.

**The data split (central idea).** A character is stored across two 1:1 tables plus child tables ([src/db/schema.ts](src/db/schema.ts)):
- `characters` — the *sheet*: identity, stats, maximums, magic disciplines/sphere maxes. Changes rarely.
- `actual_state` — the *live in-play values*: current wounds, spent resources, magic reserve currents, money, initiative dice, conditions/notes. One row per character.
- `skills`, `armor`, `weapons`, `spells`, `magic_reserves`, `effects` — N rows per character, FK cascade on delete. `magic_reserves` (issue #51) are reserve *objects*: each row is an independent pool (`max` + `current` both on the row, unlike the sheet/state split) and never touches the global réserve.

There is **no separate "status" screen**. Each character tab (`src/app/character/[id]/(tabs)/`) has a read mode and a live **edit toggle** (a FAB); edits write straight to `characters` or `actual_state` through `src/repositories/`, and screens refresh reactively via Drizzle's `useLiveQuery` (the DB is opened with `enableChangeListener`).

**French naming convention (follow it).** Generic columns are English; Prophecy game terms are French **stored without accents** (safe as DB keys) and **rendered with accents** in the UI. The mapping lives in [src/constants/prophecy.ts](src/constants/prophecy.ts): each domain entry's `key` matches a DB column, its `label` carries the accents. `NUMERIC_KEYS`, `asNumRecord`, `num`, `clamp` (in `lib/character-values`) derive stat columns centrally — reuse them instead of re-listing columns.

**SQLite is synchronous.** Drizzle's expo-sqlite driver executes synchronously; the `await db.select()...` in repositories is cosmetic (thenable over a blocking call). This matters inside `db.transaction((tx) => …)`: it commits as soon as the callback **returns**, so the body MUST use sync methods (`.run()`, `.returning().get()`, `.all()`) — an `async` callback commits before the awaited writes run. Outside a transaction either style is fine.

**Migrations & data safety.** Edit `schema.ts`, then `bunx drizzle-kit generate` (never hand-write SQL or touch `drizzle/meta/`; `generate` needs a real TTY for rename prompts). Migrations bundle via `drizzle/migrations.js` and apply in [src/app/_layout.tsx](src/app/_layout.tsx) with `useMigrations`. Before they run, the DB is snapshotted (`VACUUM INTO` → `prophecy.db.bak`, [src/db/backup.ts](src/db/backup.ts)); prod restores it on a failed migration instead of wiping. `created_at`/`updated_at` (and `effects.created_at`) use a drizzle `$defaultFn` and therefore have **no SQL default** — any raw insert into those tables must supply the timestamp.

**Never squash already-applied migrations.** Real testers run **mixed versions**, and the on-device migrator only tops up what each device is missing (SQLite has no `ADD COLUMN IF NOT EXISTS`, so one baseline can't both bootstrap a fresh install and top-up an old one). Keep the full `0000→N` chain; add new migrations on top. The forward-migration harness ([src/db/migrations.test.ts](src/db/migrations.test.ts)) guards this by seeding a DB at every prior version.

**Match the existing UI — never invent a new look for a widget that already exists.** Before adding a dialog, card, row, button or field, open the nearest existing one and copy its structure, styles and wording register. Concretely for **Paper `Dialog`s** (the DS surface): always `<Portal>` + `style={[styles.dialog, { borderColor: theme.prophecy.border }]}` with `dialog: { borderRadius: 18, borderWidth: 1 }` (Paper's default corner balloons and has no border), `Dialog.Content` with `gap: 16`, plain Paper `TextInput`s (no `mode="outlined"`, no `dense`) / `NumberField` for numbers, and `Dialog.Actions` = a plain **Annuler** button then the primary `mode="contained"` one with a `dsIcon(...)`. Live references: [campaigns/index.tsx](src/app/campaigns/index.tsx), [campaigns/[id]/index.tsx](src/app/campaigns/[id]/index.tsx), [dice-roller-fab.tsx](src/components/dice-roller-fab.tsx), [magic.tsx](src/app/character/[id]/(tabs)/magic.tsx). Destructive confirmations use a native `Alert.alert` (Annuler / destructive), not a Dialog.

**Theming.** All colors flow through `useProphecyTheme()` — never hardcode. [src/theme/prophecyTheme.tsx](src/theme/prophecyTheme.tsx) maps ~11 design-system tokens (parchment & gold; Cinzel display + Noto Sans body, loaded in `_layout.tsx`) onto MD3 roles; the remaining ~20 roles are derived by tinting and tagged `DS` vs `derived` inline. Intentionally **not** re-themed: the Prophecy tendance trio (Dragon/Fatalité/Homme) in `constants/prophecy.ts` and the per-character dragon-accent palettes in [src/theme/dragonsTheme.tsx](src/theme/dragonsTheme.tsx).

**Catalogues are GENERATED from spreadsheets — never hand-edit the arrays.** The rulebook weapon/spell pickers read `src/data/*-catalog.gen.ts`, code-generated by [scripts/build-catalogs.ts](scripts/build-catalogs.ts) from `data-src/*.csv` (Excel, séparateur `;`, BOM/CRLF/multi-line quoted cells handled by the pure parser [src/lib/csv.ts](src/lib/csv.ts)). Edit the CSV → `bun run build:catalogs`. The `.gen.ts` files are **committed** so the app builds without the script; [src/data/catalog.test.ts](src/data/catalog.test.ts) re-runs the generator inside `bun run test` and fails when they drift from the CSV. Validation is strict and refuses to write anything on error: exact header match (a misspelled optional column would silently drop data), unique kebab-case ids, formulas through `lib/formula`, enums matched loosely (case/accents, key **or** label) against `constants/prophecy`. Adding a column means touching the CSV header, the `*_COLUMNS` list and the row builder together. `src/data/*-catalog.ts` holds only the `*Preset` types + a re-export; the weapon taxonomy sits in [src/data/weapon-constants.ts](src/data/weapon-constants.ts) so the generator never imports a file it generates.

**Pure engines (unit-tested, no DB).** [src/lib/formula.ts](src/lib/formula.ts) parses/computes weapon formulas like `FOR x2 +3 +1D10` (dice stay symbolic). [src/lib/modifiers.ts](src/lib/modifiers.ts) stacks roll modifiers: temporary `effects` add up, the **wound malus is the single worst active level (max, not sum)**, and modifiers fold into a caractéristique *before* a formula's multiplier. [src/lib/character-transfer.ts](src/lib/character-transfer.ts) is the zod-validated export/import envelope (carries an optional portable character `uuid` — see below).

**Portable character `uuid`.** `characters.uuid` (nullable at the DB level; backfilled on launch by `repositories/characters.backfillCharacterUuids`, minted for new rows via `$defaultFn` using [src/lib/uuid.ts](src/lib/uuid.ts) — a dependency-free RFC-4122 v4 so `schema.ts` stays Node-loadable by drizzle-kit/vitest). It's the stable id that survives export/import and device changes; the export preserves it on **restore** and mints a fresh one on **copy/clone** (`planImport` in `character-transfer.ts`).

## Campaign mode (optional, networked)

A GM + players "campaign": players broadcast a **minimized, read-only projection** of their character to a self-hostable relay **server** ([separate repo](https://github.com/aehru/ProphecyCompanionServer): FastAPI + WebSocket + SQLite; deploy behind Caddy for TLS). The full wire contract is [docs/campaign-protocol.md](docs/campaign-protocol.md). Solo use is untouched — only an opted-in character's projection ever leaves the device.

- **The projection is the privacy boundary.** [src/lib/character-share.ts](src/lib/character-share.ts) `toSharedCharacter` emits ONLY: `nom`, caractéristiques, attributs, tendances, wounds, resources (maîtrise/chance), initiative, conditions, `skills` (**trained only**, value>0, with attribut + spec link), `effects` (**active only**, non-expired bonus/malus). **Excluded on purpose:** concept, biographie, notes, money, magic, untrained skills, expired effects. A **data-minimization test** fails if the wire widens beyond this allowed set — don't defeat it. `SHARED_SCHEMA_VERSION` is `2` (skills+effects added; evolve additively).
- **Wire layer is pure + tested.** [src/lib/campaign-protocol.ts](src/lib/campaign-protocol.ts) (message builders, tolerant zod parser, URL/scheme + join-link helpers) and [src/lib/campaign-client.ts](src/lib/campaign-client.ts) (reconnecting `CampaignSocket`, injectable WS). Mirror any wire change into the server's pydantic `app/schemas.py` — the two languages are hand-synced.
- **Live broadcast is app-level, not screen-scoped.** [src/hooks/use-campaign-live.tsx](src/hooks/use-campaign-live.tsx) provider (mounted in `_layout.tsx` above the Stack) keeps ONE campaign broadcasting on any screen while foregrounded; global floating indicator ([src/components/campaign-live-indicator.tsx](src/components/campaign-live-indicator.tsx)). Broadcasts ALL characters shared into the campaign on ONE socket (protocol v2 — hello has no charId, share/unshare frames carry it; GM broadcasts PNJs the same way via `gmHello`). Pushes when a character's **projection** changed ([src/lib/campaign-live.ts](src/lib/campaign-live.ts) `projectionSignature` — in-play values AND sheet edits, so finishing a character edit syncs to the GM), per-char signature on a shared 5s debounce; unsharing while live sends `unshare` on the live socket (paused → `unshareFromServer` purge). Stop = pause (last state stays on server); auto-resumes across restart (AsyncStorage). GM identity = portable `gmToken` (server stores only its hash), NOT a device id.
- **Tables** ([schema.ts](src/db/schema.ts)): `campaigns` (code, role, `gm_token`, `server_url`), `campaign_shares`, `gm_notes` (GM device only, keyed by `charUuid`). Repo: [src/repositories/campaigns.ts](src/repositories/campaigns.ts).
- **GDPR/consent:** persistent disclaimer on the campaign list (covers the GM), a contextual line in the join dialog (QR/deep-link joins land there directly), and [PRIVACY.md](PRIVACY.md) distinguishes solo (local) from campaign (opt-in projection under the host's responsibility). Leave/stop purges the server row.
- **Known wart** (documented in [ROADMAP.md](ROADMAP.md)): a broadcasting GM device holds two sockets (screen-scoped roster socket + app-level live socket) — duplicate frames, harmless; merge later.

## Testing

Vitest runs in a **Node** environment ([vitest.config.ts](vitest.config.ts) mirrors the `@/` → `src` alias). Three kinds work today: pure logic (`lib/*`); the **forward-migration harness** ([src/db/migrations.test.ts](src/db/migrations.test.ts)) — it replays `drizzle/*.sql` against `better-sqlite3`, seeding a DB at each prior schema version to catch NOT-NULL-without-default, tightened CHECKs, and journal drift; and the **catalogue freshness check** ([src/data/catalog.test.ts](src/data/catalog.test.ts)), which re-runs the CSV generator and diffs it against the committed `.gen.ts`. **Run tests after every `drizzle-kit generate`.** Repository logic isn't testable yet (it imports the expo-sqlite `db` singleton — needs dependency injection first).
