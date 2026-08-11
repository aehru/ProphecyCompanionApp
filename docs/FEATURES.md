# Features, in detail

The full tour of what the app does, screen by screen. For the short version, see
[README.md](../README.md).

The app opens on your **character roster** — every character with name + concept. Tap **+** to create one; tap a character to open its five tabs: **Accueil**, **Fiche**, **Compétences**, **Inventaire**, **Magie**.

## The data split

Prophecy character sheets have a lot of moving parts. The app keeps two kinds of data apart under the hood:

- **The sheet** — the character you build: identity, *tendances*, *caractéristiques*, *attributs*, max health, resource pools, magic, skills, weapons, armor, shields, biography. Changes rarely.
- **The live values** — what changes during a session: current wounds, spent resources, initiative dice, magic reserve, money, temporary effects, conditions and notes.

Both live in the same screens: each tab has a **read mode** and a **live edit mode** (the floating pencil). Flip to edit to nudge values mid-combat; flip back to a clean glance. Edits save instantly and live-update across every screen. There's no separate "statut" screen anymore.

## Accueil — home dashboard

A glanceable, read-only landing:
- Identity header: avatar (tap to set from your photos), name, concept chip.
- The three **tendances** as ring gauges (Dragon, Fatalité, Homme).
- **En bref** vitals — total wounds taken vs max, and the Maîtrise / Chance pools.
- **Illustration** — an optional full portrait, collapsed by default.
- **Lancer les dés** — a free-form dice roller (the dice FAB): pick a count and a die (D4 → D20, defaulting to D10), get each die and the total. Independent of any stat, and nothing is kept — there's no roll history.

## Fiche — the full sheet

Every stat, editable inline via the tab's pencil. The header pencil opens the full identity/maximums form (and lets you delete the character).
- **Tendances** — a triangle; in edit mode tap for +1, long-press for −1, and set the 0–10 *puces* subnumber.
- **Caractéristiques** — the 8 stats (Force, Résistance, Intelligence, Volonté, Coordination, Perception, Présence, Empathie).
- **Attributs** — Physique, Mental, Manuel, Social.
- Stat badges fold in the **live total modifier** — temporary effects plus the current wound malus.
- **Initiative** — per-die values for the current turn, with a roll-all button; a rolled die driven to 0 or below by the wound malus is flagged unusable.
- **Santé** — wound boxes per level (Égratignure → Mort), with each level's malus; tap boxes to fill/clear current damage.
- **Effets** — temporary bonuses / maluses (see below).
- **Armure** — the equipped armor's defense pool, tracked here.
- **Bouclier** — the equipped shield's defense pool, tracked here.
- **Ressources** — Maîtrise & Chance: spend −1 / restore +1 against their max, or refill.
- **Conditions** — free-text conditions & notes for the session.
- **Biographie** — free text.

## Effets — temporary bonus / malus system

Add an effect that targets **every roll**, a single caractéristique, or a single attribut, with a signed value and a duration counted in actions / rounds / hours / days. A **"temps écoulé"** control ticks down every effect sharing a time unit by one; expired effects are struck through but kept. Active effects fold automatically into the matching stat badges, alongside the wound malus.

## Compétences

Your skills, each linked to an attribut. Start from the built-in Prophecy 2e skill catalogue or add your own free-text skills. Skills at value 0 aren't kept. The search + attribut filter tabs sit at the bottom of the screen, within thumb reach.

## Inventaire — weapons, armor, shields & gear

- **Argent** — the four Drac coins (or, argent, bronze, fer), edited here.
- **Armes** — add from the **rulebook weapon catalogue** (the sword FAB) or build your own; the pencil opens the full editor. A weapon carries name, damage, prerequisites, effective & max range, two initiative modifiers (mêlée / corps à corps), creation difficulty & time, and free-text special effects.
  - **Formulas** — damage and ranges accept caractéristique-based formulas like `FOR x2 +3 +1D10`. Each card shows the formula *and* its computed result for the character (with Force 4 → `11 + 1D10`); dice stay unrolled. Effects and the wound malus are folded into the caractéristique before the multiplier.
  - **Prerequisites** like `FOR 4, COO 5` are checked against the character and flagged met/unmet.
- **Armures** — add from the **rulebook armor catalogue** (the shield FAB) or build your own. Carries a weight category (légère / moyenne / lourde), defense max, prerequisites, creation difficulty & time, a pénalité d'encombrement, and free-text special effects. Tap the tile to equip one armor at a time; **Réparer** refills defense — the equipped armor's live defense also shows on the Fiche.
- **Boucliers** — same idea as armor, but a shield can also strike: it carries a damage formula (like a weapon) alongside its own defense pool, prerequisites, creation and encombrement. Equip is independent of armor and of any weapon — one armor, one shield, and your weapons can all be equipped together.
- **Objets** — free-text inventory for anything that isn't a weapon/armor/shield (a rune, a potion, rope…): name, description, a stackable quantity, and a multi-slot equipped toggle (several objects can be worn/held at once). Searchable once you have more than a couple.

## Magie

- **Disciplines** — Invocatoire, Instinctive, Sorcellerie (plain stats, edited on the Fiche form).
- **Réserve** — the global magic reserve plus each known **sphère** (Cités, Feu, Métal, Nature, Océans, Pierre, Rêves, Vents, Ombre), tracked as bullet pools; a sphere appears once its max > 0.
- **Objets de réserve** — items holding their own magic puces (gemme, bâton, talisman). The section only shows up once the character owns one (or while editing, to add the first): **Ajouter un objet** asks a name and a number of puces. Each object is an independent pool spent by tapping its bullets, so the global reserve stays untouched. Tap an object's name to rename or re-size it, the bin to delete it.
- **Sortilèges** — add spells from the catalogue (the magic FAB) or your own. Each spell carries niveau, complexité, discipline, sphère, coût, incantation (temps + unité), difficulté, clé, and effet, editable in a modal.
- **Enchantements** — bind an enchantment to a weapon, armor, shield or object (a name, an optional linked spell that copies its effet, and a current/max charge count). Each card shows what it's bound to and whether that item is currently equipped; a small badge marks enchanted gear everywhere it's listed (Inventaire cards included).

## Backup & transfer

**Long-press a character** in the roster to enter selection mode (taps then toggle rows), and the header turns into four actions: **tout sélectionner**, **dupliquer**, **exporter**, **supprimer**. Export writes the selection to a JSON file through the OS share sheet — save it to Files, send it to another device. **Importer…**, in the roster's **⋮** menu, reads one back.

Export asks what the file is *for*, and the answer changes what happens on import:
- **Sauvegarde** — keeps each character's portable id, so re-importing restores *that* character in place instead of doubling it (campaign slot and GM notes still attached).
- **Partage** — strips it, so the friend you send it to gets their own copy with a fresh lineage. Two devices broadcasting the same id would fight over one campaign roster slot.

Your safety net against device loss, and how you move a character between phones. *(Character illustrations aren't included in the export yet.)*

## Campagnes — the GM's table, with or without a server

From the roster header's **group** icon, open **Campagnes**:
- **The GM** creates a **table** — no server, no account, no network. Add **PNJ** (a name is enough; they're ordinary characters, badged as such in your roster) and **La Compagnie** shows the whole table at once: one card each, switchable between **Attributs**, **Compétences** (searchable across everyone, with each skill's total and active modifier) and **Tendances**, plus an **Initiative** tab ranking one row per die. Tap a card for the sheet — your own PNJ open in full (armes with their damage resolved, armures, boucliers, sorts) and editable in place: wounds, ressources, conditions, effets. **Private notes** never leave your phone.
- **Connecting a server** (a shared community instance or one your group self-hosts) is the optional bonus: it mints a **join code** + **QR code**, and your players' characters join the same roster, read-only.
- **A player** joins with the code (type it, or scan the GM's QR), picks which character to share, and taps **Diffuser**. From then on, changes to the character's *in-play* values (wounds, Maîtrise/Chance, tendances, conditions, initiative, active effects) stream to the GM in near real-time. A floating indicator shows you're broadcasting; **Arrêter** pauses it.

**Privacy by design.** A table with no server sends nothing at all, and your PNJ stay on your device even when one is connected (publishing them is an off-by-default switch, meant for a co-MJ). From a player, only a minimized extract is sent — **name, combat state, caractéristiques, attributs, tendances, trained skills, and active bonuses/maluses**. Never your biography, notes, money, magic, or untrained skills. The data lives on the chosen server under its host's responsibility (community instance or self-hosted); stopping the share or leaving the campaign erases it. See [PRIVACY.md](../PRIVACY.md). The server is open source — run your own from the [ProphecyCompanionServer](https://github.com/aehru/ProphecyCompanionServer) repo (`docker compose up` on your LAN).

## Diagnostic — for the beta, on your terms

Also from the roster's **⋮** menu. During the public beta the app keeps a **local log** of what it does — screens opened, records written, migrations, errors — so a bug report can be acted on. Set how much detail it keeps, read every line as it happens, then **Partager** it (share sheet), **Copier** it, or **Effacer** it.

Nothing is sent automatically: there's no server, no analytics and no crash upload behind it. The log records **technical identifiers only** — a character is `characterId: 12`, a change is a list of column names — and never your names, biographies, notes, sheet values, join codes or server addresses. It's capped at 1500 entries / 512 KB, purged after 7 days, and stamped with a session id drawn at random each launch that's never stored. **Confidentialité**, in the same menu, explains all of this in the app.
