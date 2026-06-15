# Prophecy Companion App

A mobile companion app for the French tabletop RPG **Prophecy (2nd edition)**. Create, store, and play your characters from your phone — keep track of the things that change at the table so you can leave the paper sheet at home.

> The app's interface is in **French**, matching the Prophecy 2e rulebook and its terminology.

## What it does

Prophecy character sheets have a lot of moving parts. This app splits them in two:

- **The sheet (fiche)** — the character you build: identity, *tendances*, *caractéristiques*, *attributs*, max health, resource pools, skills, biography. Changes rarely.
- **The live status (statut)** — what changes during a session: current wounds, spent resources, initiative dice, conditions and notes. Built for quick taps mid-combat.

Everything is stored **locally on your device** (SQLite). No account, no network, no cloud.

## Features

### Character roster
- List of all your characters with name + concept.
- Tap **+** to create one; tap a character to open it.

### Character sheet (Résumé / Compétences / Armes tabs)
- **Tendances** — Dragon, Fatalité, Homme, shown as a triangle, each with a main value and a 0–10 *puces* subnumber.
- **Caractéristiques** — the 8 stats (Force, Résistance, Intelligence, Volonté, Coordination, Perception, Présence, Empathie).
- **Attributs** — Physique, Mental, Manuel, Social.
- **Santé** — max wound boxes per level (Égratignure → Mort).
- **Ressources** — Maîtrise, Chance, and Initiative maximums.
- **Biographie** — free text.
- **Compétences** — your skills, each linked to an attribut. Start from the built-in Prophecy 2e skill catalogue or add your own free-text skills. Skills at value 0 aren't kept. The search + attribut tabs sit at the bottom of the screen, within thumb reach.
- **Armes** — each character keeps a list of weapons (tap **+** to add, the pencil to edit inline, delete from the editor). A weapon carries its name, damage, prerequisites, effective & max range, two initiative modifiers (mêlée / corps à corps), creation difficulty & time, and free-text special effects.
  - **Formulas** — damage and ranges accept caractéristique-based formulas like `FOR x2 +3 +1D10`. Each card shows the formula *and* its computed result for the character (with Force 4 → `11 + 1D10`); dice stay unrolled.
  - **Prerequisites** like `FOR 4, COO 5` are checked against the character and flagged met/unmet.
- **Edit** the whole sheet inline; sheets can also be **deleted**.

### Live status (Statut)
Reached via the **Statut** button on the sheet. Three quick-access tabs:

- **Tendances** — tap to nudge a value (+1 tap, −1 long-press) and set *puces* during play.
- **Blessures** — enter per-die **Initiative** values for the current turn ("Nouveau tour" clears them), tap wound boxes to fill/clear current damage, edit conditions & notes, and reset all wounds with one button (*"Don de Heyra !"*).
- **Ressources** — spend/restore Maîtrise & Chance against their max.

Status edits save instantly and live-update across screens.

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
