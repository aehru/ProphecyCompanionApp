# Developing Prophecy Companion App

Contributor guide. For what the app *is*, see [README.md](README.md).

## Stack

| Concern | Choice |
|---|---|
| Framework | [Expo](https://docs.expo.dev/) SDK **54** + React Native 0.81, React 19 |
| Routing | [expo-router](https://docs.expo.dev/router/introduction) (file-based, typed routes) |
| UI | [react-native-paper](https://callstack.github.io/react-native-paper/) (Material 3) |
| DB | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Migrations | drizzle-kit |
| Language | TypeScript |
| Package manager | **bun** (`bun.lock` is the committed lockfile) |

> ⚠️ **Expo 54 specifics matter.** Read the versioned docs at <https://docs.expo.dev/versions/v54.0.0/> before adding native or SDK code. APIs drift between Expo versions.

## Prerequisites

- [bun](https://bun.sh/)
- A device or emulator:
  - **Android** — Android Studio emulator, or a physical device + the dev client.
  - **iOS** — Xcode simulator (macOS only), or a physical device + the dev client.
- This project uses native modules (`expo-sqlite`), so **Expo Go is not enough** — you need a **development build** (`expo-dev-client`).

## Setup

```bash
bun install
```

## Run

Start Metro:

```bash
bun run start         # expo start
```

Then build/launch the dev client on a target:

```bash
bun run android       # expo run:android
bun run ios           # expo run:ios
bun run web           # expo start --web (secondary target)
```

The first `run:android` / `run:ios` compiles a native dev client — slow once, fast after.

### Lint

```bash
bun run lint          # expo lint
```

## Project layout

```
src/
  app/                       # expo-router routes (file = screen)
    _layout.tsx              # root: theme, Paper provider, runs DB migrations
    index.tsx                # character roster
    character/
      new.tsx                # create-character modal
      [id]/
        _layout.tsx          # per-character stack
        (tabs)/              # Résumé + Compétences tabs
          index.tsx          #   sheet view + inline edit
          skills.tsx         #   skills view/edit
        status/              # live "Statut" — Tendances / Blessures / Ressources tabs
  components/                # reusable UI (forms, chips, bullets, triangle…)
    ui/                      # small primitives (section-card, info-row, stat-chip, character-gate)
  constants/
    prophecy.ts              # game domain: tendances, caracs, attributs, skills, wounds, resources
    theme.ts
  db/
    client.ts                # opens the SQLite DB, exposes `db`, resetDatabase()
    schema.ts                # Drizzle tables: characters, actual_state, skills
  hooks/                     # use-character-id, use-character-state, use-prophecy-theme
  lib/                       # character-values helpers, status-context
  repositories/              # data access: characters, actual-state, skills
  theme/                     # Paper/navigation themes
drizzle/                     # generated SQL migrations + meta (committed)
drizzle.config.ts
```

## Data model

Three SQLite tables (see [src/db/schema.ts](src/db/schema.ts)):

- **`characters`** — the sheet. Lots of integer stat columns, all defaulting to 0. `*Max` columns hold ceilings (wounds, resources, initiative). DB-level CHECK constraints keep tendance *sub* values in 0–10.
- **`actual_state`** — one row per character; the live in-play state (`*Current` wound/resource columns, `initiative_values` JSON, conditions, notes). Cascades on character delete.
- **`skills`** — one row per owned skill (`name`, `attribut`, `value`). Skills at value 0 are not persisted (see `replaceSkills`).

### Naming convention (important)

Generic columns are **English**; Prophecy game terms stay **French, stored without accents** (safe as keys/columns) and rendered **with accents** in the UI. Column keys in `constants/prophecy.ts` match DB columns; their `label` carries the accents. Follow this when adding fields.

### Reactivity

UI reads use Drizzle's `useLiveQuery` over expo-sqlite with `enableChangeListener: true` — writes auto-refresh the screens. Prefer query helpers in `repositories/` over inline queries.

## Migrations

Schema lives in `src/db/schema.ts`; migrations are generated SQL under `drizzle/` and bundled into the app via `drizzle/migrations.js` (imported in the root layout, applied with `useMigrations`).

Generate a migration after editing the schema:

```bash
bunx drizzle-kit generate
```

Commit the generated `drizzle/*.sql` and `drizzle/meta/*` files.

**Auto-heal:** on a failed/stale migration the root layout deletes the DB and reloads **once** (guarded by an AsyncStorage flag) — convenient in dev, but it means a bad migration wipes local data. `resetDatabase()` in [src/db/client.ts](src/db/client.ts) is the manual escape hatch.

## Conventions

- Path alias `@/…` → `src/…`.
- Typed routes are on (`experiments.typedRoutes`) — cast hrefs with `as Href` where inference falls short, as existing screens do.
- React Compiler is on (`experiments.reactCompiler`) — avoid manual memo hacks that fight it.
- Theming goes through `useProphecyTheme()` / the Paper provider; don't hardcode colors outside the theme files.
- Numeric stat keys are derived centrally (`NUMERIC_KEYS`, `asNumRecord`, `num`, `clamp` in `lib/character-values`) — reuse them instead of re-listing columns.

## License

[MIT](LICENSE).
