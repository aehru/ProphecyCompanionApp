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

## Performance

- [ ] **Cache prepared statements in the driver.** Every non-`run` query in
  [src/db/client.ts](src/db/client.ts) does `prepareAsync` → `executeForRawResultAsync`
  → `finalizeAsync`, so identical SQL is re-compiled on every call. That matters
  because the app is subscription-heavy: a character tab holds seven to nine
  `useLiveQuery` subscriptions, and drizzle refetches on any write to a watched
  table — one wound tap re-runs, re-prepares and re-finalizes the lot.
  _Sketch:_ a `Map<sqlText, SQLiteStatement>` in front of `execute`, finalizing
  on `closeConnection()` so a restore can still swap the file underneath.
  _Why it is not done yet:_ **nobody has measured it.** It was inferred from
  reading the driver, not from a profile, and it sits on the path every single
  query in the app takes — the worst place to trade correctness for a win of
  unknown size. The failure modes are real: a statement outliving its
  connection across the lock-retry reopen, and cache growth on the parameterized
  `inArray` queries, whose SQL text varies with the number of ids.
  _Do this in order:_ profile a real device first (a stat stepper on a character
  with a full sheet is the loudest case), and only then cache — the repository
  harness added in [test-db.ts](src/repositories/test-db.ts) can now cover the
  lifecycle. **If a tester reports the sheet feeling sluggish on a low-end
  Android while everything else is fine, this is the first suspect.**

## Game content

- [x] **Manage spells** — spellbook with catalogue + editor, disciplines, reserve & spheres.
- [x] **Money** — the four Drac coins tracked on the sheet.
- [x] **Armor & shield catalogues.** Armor gained weapon-level fields (category, prerequisites, creation, encombrement) and a real catalogue picker (was a blank-only inline editor). Shields added end-to-end: table, catalogue, editor/card, independent equip slot, enchant target, export/import. `data-src/armor.csv` / `shield.csv` are seeded with real rulebook rows; extend them as more gear is added.
- [~] **Avantages & désavantages.** The sheet half is done end-to-end: the
  `traits` table (one table, `kind` discriminates), the point pool
  ([lib/trait-pool.ts](src/lib/trait-pool.ts) — désavantages grant, avantages
  spend, the balance may go negative), a catalogue picker with a tier dialog for
  the entries the rulebook prices at several levels, the editor modal, and
  export/import. Deliberately NOT in the campaign projection: what a character is
  bad at is not roster data.
  _Remaining, in order:_
  1. **The rulebook rows.** The 11 « Désavantages communs » are in
     `data-src/traits.csv`, each with its `effetJeu` summary. The rest of the
     désavantages (Rares, Enfant, Ancien) and every avantage are still to type —
     the app never invents rulebook text, so they arrive one scanned page at a
     time, then `bun run build:catalogs`.
  2. **Mechanical effects.** Traits are descriptive today: nothing computes from
     one. Once the full list exists, the shape of what they actually do is
     knowable, and the ones granting a flat bonus/malus should write an `effects`
     row rather than grow a second modifier engine. Some of them are `RollContext`
     work instead («&nbsp;2 dés sur tout ce qui touche au MENTAL&nbsp;» — see the
     dice roller entry, whose `dice` / `diceMode` fields exist for exactly this).
  3. **Creation-time quotas.** The rulebook's rules — an « Ancien » takes two
     Communs and one Rare, a minimum point count per age bracket — need a
     character age the sheet does not record, and belong to a creation flow.
     Nothing is enforced today, on purpose.
  4. **Catalogue propagation.** Picked rows carry `presetId` + `presetRevision`
     like spells do, and nothing consumes them yet (same flow, same blocker).
- [ ] **Wire `encombrementMalus` into rolls.** Currently stored/displayed only — not folded into `lib/modifiers` like the wound malus is.
- [~] **Dice roller in context.** Done for **compétences**: tapping a skill's TOT
  opens the roller against it and rolls a D10 at once, with the difficulté
  prefilled at 15, « Confirmer » for a 10 or a 1, and the tendance trio selectable
  so the kept die becomes the roll. The rules live in [lib/roll.ts](src/lib/roll.ts)
  and the header button still opens the free-form roller — context arrives ONLY by
  tapping a value and dies with the dialog, like the results.
  Done too for **caractéristiques and attributs**: tapping a tile on the Fiche
  rolls it, adding the modifier the tile's badge deliberately doesn't show in
  full (the wound malus is badged once per character, not per stat). Every
  context is built in [lib/roll-context.ts](src/lib/roll-context.ts) so the
  confirm rule lives in one place. **An attribut confirms on itself** — the rule
  names the compétence or the caractéristique, and a bare attribut roll has
  neither.
  A test can throw **several D10** — a « Dés » field plus a Garder / Sommer
  toggle, since effects grant both readings and the sheet models neither yet.
  `RollContext.dice` / `.diceMode` are the hooks for when traits land («&nbsp;2 dés
  sur tout ce qui touche au MENTAL&nbsp;»): the builder will set them and no screen
  will learn the rule twice.
  Done for **weapons** as well: the attack total in a weapon's detail is the roll
  button, going through `weaponRollContext` — an attack IS its compétence's roll,
  so the weapon only names it. A weapon with no compétence linked, or naming one
  that no longer exists, has no total and stays unrollable.
  The attack total rides on the collapsed row as a [`<TotalBadge>`](src/components/ui/total-badge.tsx)
  — the very component a spell's score uses, so the two rows can't drift — and
  the badge IS the roll button: it rolls, the row around it still expands. The
  GM's NPC weapon cards roll the same way, being the GM's own local rows.
  **Spells** roll from the same badge, through `spellRollContext`: the score's
  terms each become a part (sphère, discipline, wound, clé), the difficulté
  prefills from `spells.difficulty` — falling back to 15 when the spell carries
  none — and **the discipline is what confirms** a 10 or a 1.
  For gear the badge is the ONLY roll button: an expanded card shows its
  breakdown as a reading and offers no second control, since two ways to make one
  roll on one card is a question the player shouldn't have to answer.
  A **cast** follows the magic rules on top: Miracle / Contrecoup naming, no +5,
  and on the tendance trio the discarded dice can backlash — see the `readDice`
  paragraph in [CLAUDE.md](CLAUDE.md). Each die owing a reroll gets its own
  « Confirmer » row, because which die produced which outcome is the whole point.
  _Remaining:_ the stat tiles on the dashboard, which stay a reading for
  now; plus the UI that builds
  a multi-part context (MEN + VOL, optionally + a tendance die) — `RollContext.parts`
  is already a list precisely so that needs no type change. Whatever gets added
  must name its own `confirm` value: no rule says which part of a sum a 10 is
  confirmed against. Still no roll history — results are forgotten on close.
- [ ] **« Lancer le sort » — the cast flow.** The last piece of the spell
  breakdown layer; everything it needs is already in place. Today a durée renders
  symbolically (« 1 + NR jours ») because NR belongs to a *cast*, not to a spell:
  `FormulaVars.nr` is the one resolver nothing fills. An earlier inline "NR
  obtenu" field on `<SpellDetail>` was **removed on purpose** — the number is
  worth entering as part of casting, not as a stray field, so don't re-add it
  standalone.
  _Agreed flow:_ a button on the spell card opens a `<DsDialog>` showing `total`
  vs `difficulté` → the player enters the NR they rolled → durée / cibles resolve
  through `spellFormulaResult` → **two checkboxes, both OFF by default**:
  ☐ déduire le coût de la réserve, ☐ créer l'effet. Nothing fires on its own; a
  player who prefers doing it by hand ignores the button entirely.
  _Why the pieces fit:_ `TIME_UNITS` was merged into one list ([src/constants/prophecy.ts](src/constants/prophecy.ts))
  precisely so a durée in semaines or cycles can become an `effects` row with no
  conversion step. 70% of catalogue spells carry a machine-readable `duration`;
  the rest state it in `inGameEffect` and the dialog should simply not offer the
  effect checkbox for those.
  _Open questions:_ **which pool the coût comes from** — `reserveMagiqueCurrent`,
  the per-sphere current, or a `magic_reserves` row — is a real rules choice, not
  an implementation detail, and the dialog probably has to ask. And the deferred
  `bonus` column (« +5 à Discrétion ») was left out on purpose, so the created
  effect starts from prefilled, editable text rather than a parsed target.
- [x] **« Mettre à jour depuis le catalogue » — propagate rulebook corrections
  to spells players already picked.** Provenance (`spells.preset_id` +
  `preset_revision`, the preset's content fingerprint from `lib/preset-revision`)
  is the signal; a row with no `preset_id` is the player's own and is never a
  candidate — that asymmetry is the safety property, and provenance is **never
  inferred from a name match**. `planSpellSync(rows, presets)`
  ([lib/spell-sync.ts](src/lib/spell-sync.ts), pure + tested) splits the
  difference two ways: a column the sheet left EMPTY that the catalogue now
  fills is applied without a question (nothing of the player's is at stake),
  while two values that disagree are a conflict. The decision is **per
  sortilège, not per column** — a spell is read as one paragraph, and "my effect
  but their durée" is a state nobody can check afterwards. `cleParfaite` and
  every in-play value stay outside it. The current revision is stamped on
  decline as well as on accept, so a refused change stops being offered until
  the entry actually moves again.
  The sweep is **app-wide** ([catalog-sync.tsx](src/app/catalog-sync.tsx),
  reached from the Catalogues tab's overflow): a correction lands for every
  sheet at once, and a GM holding a dozen NPCs would otherwise walk the same
  dialog a dozen times. One transaction for the whole plan
  ([repositories/spell-sync.ts](src/repositories/spell-sync.ts)).
  _Agreed non-goals:_ no undo beyond `prophecy.db.bak`; a spell newly added to
  the catalogue does nothing (the player picks it); a spell removed from the
  catalogue leaves the row alone.
  _Deliberately absent:_ **no backfill for rows predating the columns.** They
  read as hand-made forever. Beta sheets hold a handful of spells and re-adding
  them is cheaper than a name-matching heuristic that quietly mis-classifies the
  spells renamed during the rework.
  _Same gap, not addressed:_ weapons / armor / shields carry no revision at all,
  so a correction there is unpropagatable by any means. Adding one is the same
  three lines in the generator, if it ever matters.
- [ ] **Re-test the catalogue previews on web/desktop after the PWA merge.** The
  expandable preview rows (`<CatalogRow>` + the shared `*Detail` bodies) were
  verified by typecheck, the test suite and a full **web bundle**, but not by
  clicking them in a browser: on this base expo-sqlite's *sync* web bridge dies
  at boot (`SharedArrayBuffer is not defined`, then `Sync operation timeout`), so
  the exported app never reaches a screen. Once the async sqlite-proxy / PWA work
  lands, re-check on web specifically: the `+` `IconButton` nested inside the
  row's `Pressable` (that both fire correctly and the tap targets don't overlap),
  and the Snackbar's « Modifier » action.

## Web target

- [x] **`Alert.alert` is a no-op on web.** react-native-web ships `class Alert { static alert() {} }`,
  so on the web build every confirmation and every error popup silently did nothing: the
  destructive confirms (supprimer un personnage / une table / une arme, relancer
  l'initiative) never appeared, so their `onPress` never ran and the button read as dead,
  and the `Alert.alert('Erreur', …)` surfaces (join campaign, `attachServer`) swallowed the
  message.
  _Shipped:_ [`@/lib/alert`](src/lib/alert.ts) — react-native's exact signature, so each of
  the 26 call sites changed **one import line**. It renders a
  [`<DsDialog>`](src/components/ui/ds-dialog.tsx) on **every** platform rather than
  platform-splitting: a `Platform.OS` branch leaves one half that the other platform's
  developer never exercises, which is how the web half rotted unnoticed in the first place.
  The queue + the button split are pure and unit-tested; `<AlertHost>` renders them under
  `<PaperProvider>`; an ESLint `no-restricted-imports` rule blocks the react-native `Alert`
  from creeping back; `e2e/alerts.spec.ts` proves the confirm on the real web export.
  _Traded away, knowingly:_ iOS's free destructive-red (re-applied as `colors.error`) and the
  OS alert's focus trap / VoiceOver announcement — Paper's `Portal` sets the roles but is not
  equal to a native alert. **If a screen ever needs an alert over react-native's `Modal`**
  (only `qr-scanner.tsx` uses one), it will not show: that is a real window, not a portal.

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
- [x] **Adding a bonus/malus to a PNJ from the table.** Creating AND editing an
  effect now happen in [`<EffectDialog>`](src/components/effect-dialog.tsx), owned
  by `<EffectsCard>` — so both callers (the Fiche, `<NpcInPlayEditor>`) get the
  same surface and the GM never leaves the campaign screen. The `effect/[eid]`
  modal route is gone with it. The dialog **drafts**: nothing is written until
  « Enregistrer », where the old flow inserted a blank row up front and left a +0
  effect behind whenever the editor was backed out of.
- [ ] **A quick-created PNJ has no wound boxes and no initiative dice.**
  `createNpc` ([src/repositories/campaigns.ts](src/repositories/campaigns.ts))
  builds the character with a name only, so every `*Max` column keeps its `0`
  default. `<HealthSection>` then draws `Bullets count={0}` (a bare `—`), so the
  GM can never tick a wound and `woundMalus` is pinned at 0 for that PNJ; with
  `initiativeMax` 0, `rollInitiativeFor` skips it and it never enters the turn
  order. The malus plumbing itself is fine — there is simply nothing to fill.
  _Fix:_ seed rulebook defaults in `createNpc` (needs the per-level box counts
  from the rulebook — **to check**), and/or let `<NpcInPlayEditor>` set the
  maxes inline so the GM doesn't have to leave the table for the full sheet.
- [ ] **Phase 3 — co-GM.** `share_npcs` publishes the NPCs already; a second GM
  seat needs server-side work (a second gmToken, ownership rules).
  - [ ] **Per-die icons stay local — revisit for the co-GM.** Each initiative die
    can carry an icon saying what granted it (off hand, sort, action retardée).
    Deliberately NOT projected: a GM doesn't need it for a *player's* character,
    and it would widen the wire for people who never asked. A co-GM reading the
    host's PNJs is the one case that wants it — at which point the icon key (an
    enum, never free text) joins the projection and `SHARED_SCHEMA_VERSION` goes
    to 3. Until then the column is device-local.
- [x] **Phase 4 — docs.** `docs/campaign-protocol.md` gained a Scope section (the
  relay is optional, the roster is a local-first merge, NPCs are opt-in);
  PRIVACY.md and README describe the serverless table. PRIVACY's permissions
  section was also wrong — it claimed none were requested, while the QR scanner
  uses the camera and the avatar picker the media library.

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
- [ ] **Watch: swipeable tabs keep three roster lists mounted.** The Compagnie's
  Attributs / Compétences / Tendances tabs are three pages of a
  [`<TabPager>`](src/components/ui/tab-pager.tsx), so each has its own
  `FlatList` over the same roster ([roster-list.tsx](src/components/campaign/roster-list.tsx)).
  Pages mount lazily, but once a GM has visited all three they stay mounted —
  three windowed lists of tall cards (rings + skill groups) instead of one.
  Fine on the tables tested so far; **if a GM with a big table (approaching the
  server's 16-projection cap, or many spawned NPCs) reports stutter when
  swiping, this is the first suspect.** Fixes, cheapest first: drop
  `initialNumToRender` on inactive pages, unmount pages more than one away from
  the active one, or hoist the list so the three tabs share one instance and
  only the card BODY swipes. Same shape applies to Magie and Inventaire, but
  their pages are far lighter.
