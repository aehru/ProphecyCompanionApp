# Prophecy Companion App

A mobile companion app for the French tabletop RPG **Prophecy (2nd edition)**. Create, store, and play your characters from your phone — keep track of the things that change at the table so you can leave the paper sheet at home.

> The app's interface is in **French**, matching the Prophecy 2e rulebook and its terminology.

![banner](assets/images/appstore_banner.png "Banner")

## What it does

Prophecy character sheets have a lot of moving parts. The app keeps two kinds of data apart under the hood:

- **The sheet** — the character you build: identity, *tendances*, *caractéristiques*, *attributs*, max health, resource pools, magic, skills, weapons, armor, biography. Changes rarely.
- **The live values** — what changes during a session: current wounds, spent resources, initiative dice, magic reserve, money, temporary effects, conditions and notes.

Both live in the same screens: each tab has a **read mode** and a **live edit mode** (the floating pencil). Flip to edit to nudge values mid-combat; flip back to a clean glance. Edits save instantly and live-update across every screen. There's no separate "statut" screen anymore.

Everything is stored **locally on your device** (SQLite). No account, no network, no cloud.

## Features

The app opens on your **character roster** — every character with name + concept. Tap **+** to create one; tap a character to open its five tabs: **Accueil**, **Fiche**, **Compétences**, **Armes**, **Magie**.

### Accueil — home dashboard
A glanceable, read-only landing:
- Identity header: avatar (tap to set from your photos), name, concept chip.
- The three **tendances** as ring gauges (Dragon, Fatalité, Homme).
- **En bref** vitals — total wounds taken vs max, and the Maîtrise / Chance pools.
- **Illustration** — an optional full portrait, collapsed by default.

### Fiche — the full sheet
Every stat, editable inline via the tab's pencil. The header pencil opens the full identity/maximums form (and lets you delete the character).
- **Tendances** — a triangle; in edit mode tap for +1, long-press for −1, and set the 0–10 *puces* subnumber.
- **Caractéristiques** — the 8 stats (Force, Résistance, Intelligence, Volonté, Coordination, Perception, Présence, Empathie).
- **Attributs** — Physique, Mental, Manuel, Social.
- Stat badges fold in the **live total modifier** — temporary effects plus the current wound malus.
- **Santé** — wound boxes per level (Égratignure → Mort), with each level's malus; tap boxes to fill/clear current damage.
- **Effets** — temporary bonuses / maluses (see below).
- **Armure** — the equipped armor's defense pool, tracked here.
- **Ressources** — Maîtrise & Chance: spend −1 / restore +1 against their max, or refill.
- **Argent** — the four Drac coins (or, argent, bronze, fer).
- **Conditions** — free-text conditions & notes for the session.
- **Biographie** — free text.

### Effets — temporary bonus / malus system
Add an effect that targets **every roll**, a single caractéristique, or a single attribut, with a signed value and a duration counted in actions / rounds / hours / days. A **"temps écoulé"** control ticks down every effect sharing a time unit by one; expired effects are struck through but kept. Active effects fold automatically into the matching stat badges, alongside the wound malus.

### Compétences
Your skills, each linked to an attribut. Start from the built-in Prophecy 2e skill catalogue or add your own free-text skills. Skills at value 0 aren't kept. The search + attribut filter tabs sit at the bottom of the screen, within thumb reach.

### Armes — weapons & armor
- **Initiative** — per-die values for the current turn, edited here.
- **Armes** — add from the **rulebook weapon catalogue** (the sword FAB) or build your own; the pencil edits inline. A weapon carries name, damage, prerequisites, effective & max range, two initiative modifiers (mêlée / corps à corps), creation difficulty & time, and free-text special effects.
  - **Formulas** — damage and ranges accept caractéristique-based formulas like `FOR x2 +3 +1D10`. Each card shows the formula *and* its computed result for the character (with Force 4 → `11 + 1D10`); dice stay unrolled. Effects and the wound malus are folded into the caractéristique before the multiplier.
  - **Prerequisites** like `FOR 4, COO 5` are checked against the character and flagged met/unmet.
- **Armures** — add armor (the shield FAB), set its defense max, and tap the shield tile to equip one at a time. **Réparer** refills defense; the equipped armor's live defense also shows on the Fiche.

### Magie
- **Disciplines** — Invocatoire, Instinctive, Sorcellerie (plain stats, edited on the Fiche form).
- **Réserve** — the global magic reserve plus each known **sphère** (Cités, Feu, Métal, Nature, Océans, Pierre, Rêves, Vents, Ombre), tracked as bullet pools; a sphere appears once its max > 0.
- **Sortilèges** — add spells from the catalogue (the magic FAB) or your own. Each spell carries complexité, discipline, sphère, coût, incantation (temps + unité), difficulté, clé, and effet, editable in a modal.

## Platforms

Built with Expo for **iOS and Android**. (A web build exists but mobile is the primary target.)

## Installing / running

This is an Expo app. To try it on a device or simulator, see **[DEV.md](DEV.md)** for setup.

## Status

Early development. Game content may change.

## License

[MIT](LICENSE).

---

*Prophecy is a trademark of its respective owners. This is an unofficial fan-made companion tool and is not affiliated with or endorsed by the publisher.*
