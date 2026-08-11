<div align="center">

# Prophecy Companion

**Leave the paper sheet at home.** A mobile companion for the French tabletop RPG
**Prophecy (2nd edition)** — build your characters, and track what actually moves
during a session: wounds, ressources, initiative, effets, réserve de magie.

[![Get it on Google Play](https://img.shields.io/badge/Google%20Play-download-c9a227?logo=googleplay&logoColor=white&style=flat-square)](https://play.google.com/store/apps/details?id=fr.aehru.prophecyapp)
[![CI](https://img.shields.io/github/actions/workflow/status/aehru/ProphecyCompanionApp/ci.yml?branch=dev&label=CI&style=flat-square)](https://github.com/aehru/ProphecyCompanionApp/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/aehru/ProphecyCompanionApp?label=version&sort=semver&color=c9a227&style=flat-square)](https://github.com/aehru/ProphecyCompanionApp/tags)
[![License: MIT](https://img.shields.io/github/license/aehru/ProphecyCompanionApp?color=c9a227&style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-8a6d3b?style=flat-square)](#get-the-app)
[![Offline first](https://img.shields.io/badge/offline--first-no%20account%2C%20no%20cloud-2e7d32?style=flat-square)](PRIVACY.md)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-c9a227?style=flat-square)](DEV.md)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-support-FF5E5B?logo=kofi&logoColor=white&style=flat-square)](https://ko-fi.com/C6Y524WEUG)

![Prophecy Companion](assets/images/appstore_banner.png "Prophecy Companion")

</div>

> The app's interface is in **French**, matching the Prophecy 2e rulebook and its
> terminology. This README is in English for contributors.

## Why this app

- **Made for play, not for archiving.** Every tab has a read mode and a live edit
  mode (the floating pencil): nudge a wound mid-combat, flip back to a clean glance.
  Edits save instantly and propagate to every screen.
- **It does the arithmetic you keep redoing.** Wound malus, temporary effets and
  formulas like `FOR x2 +3 +1D10` are folded together, so a weapon card shows its
  real damage for *this* character in *this* state. Dice stay unrolled.
- **Yours, on your device.** SQLite on the phone. No account, no cloud, fully
  offline — except campaign mode, which you opt into share by share.
- **A table mode for the GM.** PNJ, initiative order, everyone's sheet at once —
  with no server at all. Plug one in and your players' characters join the roster.

## At a glance

| Screen | What you get |
| --- | --- |
| **Accueil** | Avatar, the three tendances as ring gauges, vitals in brief, optional full illustration, free-form dice roller. |
| **Fiche** | The whole sheet: tendances, 8 caractéristiques, attributs, initiative dice, santé, effets, armure & bouclier pools, ressources, conditions, biographie. |
| **Compétences** | Skills linked to attributs, from the Prophecy 2e catalogue or your own, with search + attribut filters within thumb reach. |
| **Inventaire** | Argent, armes (rulebook catalogue + formulas + prerequisites), armures, boucliers, objets. |
| **Magie** | Disciplines, réserve globale + spheres, standalone réserve objects, sortilèges, enchantements bound to gear. |
| **Campagnes** | The GM's table — PNJ, La Compagnie, initiative order — local by default, networked if you attach a server. |
| **Backup** | Select characters to duplicate, export to JSON (sauvegarde or partage) or delete; import a file back. |
| **Diagnostic** | A local, technical-identifiers-only log you can read, share or wipe. Nothing is sent automatically. |

**→ Full feature tour: [docs/FEATURES.md](docs/FEATURES.md).**

## Campaign mode, in one paragraph

A **table** is local-first: PNJ, their sheets, wounds and initiative live on the
GM's device, no network involved. Attaching a **server** (a community instance or
one your group self-hosts — [ProphecyCompanionServer](https://github.com/aehru/ProphecyCompanionServer),
`docker compose up`) is the bonus: it mints a join code + QR, and players
broadcast their characters to the GM's roster, read-only, in near real-time.

**Privacy by design.** Only a minimized extract leaves a player's phone — name,
combat state, caractéristiques, attributs, tendances, trained skills, active
bonuses/maluses. Never biography, notes, money, magic or untrained skills. GM PNJ
stay local unless an off-by-default switch says otherwise. Stopping the share or
leaving the campaign erases the server-side copy. Details: [PRIVACY.md](PRIVACY.md).

## Get the app

**Android — [install from Google Play](https://play.google.com/store/apps/details?id=fr.aehru.prophecyapp).**

<a href="https://play.google.com/store/apps/details?id=fr.aehru.prophecyapp"><img alt="Get it on Google Play" height="60" src="assets/images/google-play-badge.png" /></a>

iOS isn't published yet. Built with Expo for **iOS and Android**; a web build
exists, but mobile is the primary target.

Building it yourself (dev build, tooling, contribution guide): **[DEV.md](DEV.md)**.

## Status

**Public beta, live on Google Play.** Actively developed — game content and data
shapes may still change between versions.

## Support

If the app saves you a session's worth of erasing and re-writing, you can toss a coin to the ~~witcher~~ developer:

<a href='https://ko-fi.com/C6Y524WEUG' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## License

[MIT](LICENSE).

---

*Prophecy is a trademark of its respective owners. This is an unofficial fan-made companion tool and is not affiliated with or endorsed by the publisher.*
