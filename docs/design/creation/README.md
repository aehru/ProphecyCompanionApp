# Création guidée — brief d'implémentation

Mockups (open in a browser, they are plain HTML): the `*.dc.html` files next to
this README. They are reference for layout and wording only — build with the
app's own components and `useProphecyTheme()` colours, never copy their CSS.

| Mockup | Screen |
| --- | --- |
| `CreaDepart.dc.html` | Chooser opened by the roster's « + » |
| `CreaCaste.dc.html` | Step 1 — Caste + Statut de départ |
| *(not drawn)* | Step 2 — Identité: nom *, concept, portrait (avatar), Élu de + Lien |
| `CreaTendances.dc.html` | Step 3 — Tendances |
| `CreaCarac.dc.html` | Step 4 — Caractéristiques & attributs |
| `CreaRecap.dc.html` | Step 5 — Récapitulatif + « Créer » |

## Flow

- `src/app/character/new.tsx` becomes the chooser:
  - **Création guidée** → the wizard (recommended, primary)
  - **Fiche complète** → today's `<CharacterForm>`, unchanged (move it to e.g. `character/new-full.tsx`)
  - **Importer un fichier** → the existing import flow
- Wizard = ONE route (e.g. `src/app/character/create.tsx`) holding a `FormValues`
  object and a step index. Header: close (✕), « Étape n sur 5 », title, 5-segment
  progress bar. Footer: « Précédent » (outlined, left) / « Suivant : <next step> »
  (contained, right). Hardware back = previous step; ✕ on step > 1 asks to keep or
  discard the draft (`Alert` from `@/lib/alert`).
- Nothing is written to SQLite until « Créer » on the last step:
  `createCharacter(fromFormValues(v))`, then `router.replace` to the character.
- Only `nom` is required; « Suivant » from Identité is blocked without it, every
  other step can be skipped as is.

## Steps

1. **Caste** — 2-column grid of the 8 `CASTES` + a « Sans caste » text button.
   Each card: Cinzel name, patron dragon name, a 3dp top bar in that dragon's
   accent (`DragonAccents[dragon]` from `theme/dragonsTheme`, dark/light per scheme).
   Selected card: 1.5dp border in the accent + check icon. Below, « Statut de
   départ »: segmented 0–5, then the chosen rung's `nom` and `requis` via
   `statutsForCaste(caste, darkOrders)` / `rungLabel`, and the « Rejoindre Les
   Ordres Noirs » checkbox (switches the ladder, like the form does).
   - Needs a new constant `CASTE_PATRON: Record<Caste, GreatDragonKey>` in
     `constants/prophecy.ts`. Proposed pairs — **verify against the rulebook**:
     artisan→kezyr, combattant→kroryn, commercant→khy, erudit→ozyr, mage→nenya,
     prodige→heyra, protecteur→brorne, voyageur→szyl.
2. **Identité** — reuse the fields of `sheet-form/identity-tab.tsx` (no Caste /
   Statut there, they moved to step 1; no Biographie, it stays on the sheet).
3. **Tendances** — one card per `TENDANCES` entry: 64dp ring in the tendance's
   colour with the value, name, one short tagline, a row of `MAX_PUCES` tappable
   dots for the puces, and +/− buttons (44dp touch targets).
4. **Caractéristiques** — 2-column grid of steppers (abbr + label, −, value, +)
   for the 8 `CARACTERISTIQUES`, then the 4 `ATTRIBUTS`. Banner on top: total of the
   8 caractéristiques, and « / budget » only if a budget is set (see below).
   Under the grid, a non-blocking reminder of the chosen rung's `requis` (prose;
   nothing is checked — same rule as the rest of the app).
5. **Récapitulatif** — a summary card with a top bar and avatar ring in the caste
   accent: name, concept, caste·statut chip, three mini tendance rings, the 8
   caractéristiques in a 4×2 grid. « Valeurs de départ »: santé / ressources /
   réserve keep `toFormValues` defaults, with an « Ajuster » link opening the
   Combat + Magie fields of the current form in a `<DsDialog>`. « Ensuite, depuis
   la fiche »: Compétences, Avantages & désavantages, Armes/armures/argent.
   Primary button: « Créer <nom> ».

## New pieces (each optional, ship separately)

- **Draft**: persist `{ step, values }` to AsyncStorage (`creation.draft`) on every
  step change; the chooser offers « Reprendre le brouillon » when one exists.
  Device-local like `use-app-dragon`, never exported.
- **Budget de la table**: an optional number in AsyncStorage
  (`creation.caracBudget`), edited from the step-4 banner. A display aid only:
  over budget shows in `colors.error`, never blocks.
- **« Premiers pas »**: a dismissible card on the character home listing the
  three « Ensuite » items, each ticking itself once that part of the sheet is
  non-empty (has a skill > 0 / a trait / any gear or money). Derived, not stored,
  except the dismissal.

## Rules to respect (see CLAUDE.md)

- Small components: one file per step under `src/components/creation/`, pure logic
  (totals, step validation, draft shape) in `src/lib/creation.ts` with a vitest file.
- Dialogs via `<DsDialog>`, confirms via `Alert` from `@/lib/alert`.
- Colours only through `useProphecyTheme()` / the three allowed palettes.
- Gates: `bunx tsc --noEmit`, `bun run test`, `bun run lint`.
