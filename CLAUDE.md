# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Mobile companion app (Expo, iOS/Android) for the French tabletop RPG **Prophecy 2e**. Local-only: SQLite on device, no account, no network. UI is in **French**. See [README.md](README.md) for the feature tour, [DEV.md](DEV.md) for the contributor guide.

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
```

Native modules (`expo-sqlite`, etc.) mean **Expo Go won't work** — a dev build is required. Adding a new native dep requires a dev-client rebuild (`bun run android`/`ios`).

`bun run lint` (`expo lint`) runs ESLint 9 flat config ([eslint.config.js](eslint.config.js), built on `eslint-config-expo/flat`); `tsc --noEmit` stays the type gate. **ajv trap:** `@eslint/eslintrc` needs ajv 6 but `expo-dev-launcher` pulls ajv 8 — the committed `bun.lock` pins ajv 6 at top with ajv 8 nested. Regenerating the lockfile can re-hoist ajv 8 and make ESLint crash at load (`Cannot set properties of undefined (setting 'defaultMeta')`); if that happens, ensure `node_modules/ajv` is 6.x and expo-dev-launcher has a nested 8.x.

## Architecture

**Stack:** Expo SDK 54 + expo-router (file-based routes under `src/app`, typed routes on), RN 0.81 / React 19, react-native-paper (Material 3), Drizzle ORM over expo-sqlite. React Compiler is on — avoid manual memo hacks that fight it.

**The data split (central idea).** A character is stored across two 1:1 tables plus child tables ([src/db/schema.ts](src/db/schema.ts)):
- `characters` — the *sheet*: identity, stats, maximums, magic disciplines/sphere maxes. Changes rarely.
- `actual_state` — the *live in-play values*: current wounds, spent resources, magic reserve currents, money, initiative dice, conditions/notes. One row per character.
- `skills`, `armor`, `weapons`, `spells`, `effects` — N rows per character, FK cascade on delete.

There is **no separate "status" screen**. Each character tab (`src/app/character/[id]/(tabs)/`) has a read mode and a live **edit toggle** (a FAB); edits write straight to `characters` or `actual_state` through `src/repositories/`, and screens refresh reactively via Drizzle's `useLiveQuery` (the DB is opened with `enableChangeListener`).

**French naming convention (follow it).** Generic columns are English; Prophecy game terms are French **stored without accents** (safe as DB keys) and **rendered with accents** in the UI. The mapping lives in [src/constants/prophecy.ts](src/constants/prophecy.ts): each domain entry's `key` matches a DB column, its `label` carries the accents. `NUMERIC_KEYS`, `asNumRecord`, `num`, `clamp` (in `lib/character-values`) derive stat columns centrally — reuse them instead of re-listing columns.

**SQLite is synchronous.** Drizzle's expo-sqlite driver executes synchronously; the `await db.select()...` in repositories is cosmetic (thenable over a blocking call). This matters inside `db.transaction((tx) => …)`: it commits as soon as the callback **returns**, so the body MUST use sync methods (`.run()`, `.returning().get()`, `.all()`) — an `async` callback commits before the awaited writes run. Outside a transaction either style is fine.

**Migrations & data safety.** Edit `schema.ts`, then `bunx drizzle-kit generate` (never hand-write SQL or touch `drizzle/meta/`; `generate` needs a real TTY for rename prompts). Migrations bundle via `drizzle/migrations.js` and apply in [src/app/_layout.tsx](src/app/_layout.tsx) with `useMigrations`. Before they run, the DB is snapshotted (`VACUUM INTO` → `prophecy.db.bak`, [src/db/backup.ts](src/db/backup.ts)); prod restores it on a failed migration instead of wiping. `created_at`/`updated_at` (and `effects.created_at`) use a drizzle `$defaultFn` and therefore have **no SQL default** — any raw insert into those tables must supply the timestamp.

**Never squash already-applied migrations.** Real testers run **mixed versions**, and the on-device migrator only tops up what each device is missing (SQLite has no `ADD COLUMN IF NOT EXISTS`, so one baseline can't both bootstrap a fresh install and top-up an old one). Keep the full `0000→N` chain; add new migrations on top. The forward-migration harness ([src/db/migrations.test.ts](src/db/migrations.test.ts)) guards this by seeding a DB at every prior version.

**Theming.** All colors flow through `useProphecyTheme()` — never hardcode. [src/theme/prophecyTheme.tsx](src/theme/prophecyTheme.tsx) maps ~11 design-system tokens (parchment & gold; Cinzel display + Noto Sans body, loaded in `_layout.tsx`) onto MD3 roles; the remaining ~20 roles are derived by tinting and tagged `DS` vs `derived` inline. Intentionally **not** re-themed: the Prophecy tendance trio (Dragon/Fatalité/Homme) in `constants/prophecy.ts` and the per-character dragon-accent palettes in [src/theme/dragonsTheme.tsx](src/theme/dragonsTheme.tsx).

**Pure engines (unit-tested, no DB).** [src/lib/formula.ts](src/lib/formula.ts) parses/computes weapon formulas like `FOR x2 +3 +1D10` (dice stay symbolic). [src/lib/modifiers.ts](src/lib/modifiers.ts) stacks roll modifiers: temporary `effects` add up, the **wound malus is the single worst active level (max, not sum)**, and modifiers fold into a caractéristique *before* a formula's multiplier. [src/lib/character-transfer.ts](src/lib/character-transfer.ts) is the zod-validated export/import envelope.

## Testing

Vitest runs in a **Node** environment ([vitest.config.ts](vitest.config.ts) mirrors the `@/` → `src` alias). Two kinds work today: pure logic (`lib/*`) and the **forward-migration harness** ([src/db/migrations.test.ts](src/db/migrations.test.ts)) — it replays `drizzle/*.sql` against `better-sqlite3`, seeding a DB at each prior schema version to catch NOT-NULL-without-default, tightened CHECKs, and journal drift. **Run tests after every `drizzle-kit generate`.** Repository logic isn't testable yet (it imports the expo-sqlite `db` singleton — needs dependency injection first).
