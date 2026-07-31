# Privacy Policy

**App:** Prophecy Companion App
**Package:** `fr.aehru.prophecyapp`
**Last updated:** 2026-07-30

## Summary

Prophecy Companion App is a character-sheet manager for the *Prophecy* tabletop
role-playing game. By default it is **fully offline**: everything you enter
stays on your device, and the app requires no account, login, or sign-up.

The optional **campaign mode** lets a group play together. A Game Master's table
also works **without any server** — non-player characters, their sheets and the
turn order stay on the GM's device. Only if you connect a server and explicitly
choose to share a character is a **minimized extract** of that character sent to
it. Everything else in this policy exists to describe exactly what that means.

## Data stored on your device (always)

All data you create in the app — character sheets, statistics, skills, wounds,
resources, notes, in-play state, campaign memberships, and (for Game Masters)
private campaign notes — is stored **locally on your device** in a private
SQLite database. This data:

- is not accessible to us or to any third party;
- is removed when you delete the app or clear its data.

If you never use campaign mode, **no data ever leaves your device.**

## Campaign mode (optional, opt-in)

### What is shared

When you share a character into a campaign, only this extract is transmitted
and stored on the campaign server, so the Game Master can see it during play:

- character name;
- combat state: wound levels, resource pools (maîtrise, chance), initiative,
  active conditions;
- core statistics: caractéristiques, attributs, tendances;
- the skills you have actually trained (value above zero), with the attribut
  each is linked to and any specialization;
- the temporary bonuses and maluses currently active on you.

**Never shared, under any circumstances:** biography, concept, personal notes,
money, magic (spheres, disciplines, reserve), images, untrained skills, expired
effects, or the Game Master's private notes (those never leave the GM's device).

### Game Masters: a table without a server

Creating a table sends nothing anywhere. The non-player characters you run, their
sheets, wounds, initiative and your private notes stay on your device, exactly
like your own characters. Connecting a server is a separate, explicit action, and
it exists for one purpose: seeing the characters your players choose to share.

Your non-player characters are **not** sent to that server either, unless you
turn on the "publish my NPCs" option (off by default, meant for a second Game
Master). Turning it back off erases them from the server.

### Where it is stored, and who is responsible

A campaign lives on the **server your group chooses** when creating or joining
it. That server may be:

- the community instance operated by the developer (hosted in the **European
  Union**); or
- a server **self-hosted** by your Game Master or another member of your group
  (the server software is open source).

The shared extract is stored **under the responsibility of whoever hosts that
server**. The app shows this notice when you join a campaign. If your group
self-hosts, the developer has no access to that server or its data.

### Identifiers

Campaign mode still requires **no account**. It uses only:

- a random identifier generated for each character (no personal meaning);
- the campaign's join code;
- for Game Masters, a random token proving campaign ownership — the server
  stores only a cryptographic hash of it.

No name, e-mail address, phone number, or device identifier is collected.

### Retention and erasure

- The server keeps **only the latest** shared state of each character — no
  history.
- **Stopping the share** or **leaving the campaign** deletes your character's
  data from the server immediately.
- A Game Master **deleting the campaign** deletes all of its shared data from
  the server immediately.

## Network access

Outside campaign mode — and inside it as long as no server is connected — the app
functions fully offline and makes **no network requests**. It contains no analytics, advertising, crash-reporting, or tracking
of any kind — including in campaign mode, where the only network traffic is the
campaign data described above, exchanged with the server your group chose. If
you tap an external link, your device's web browser opens it; the app itself
sends nothing.

## Permissions

The app requests no permission on its own. Two are asked for only at the moment
you use the matching feature, and can be declined without blocking anything else:

- **Camera** — to scan a Game Master's invitation QR code. Nothing is recorded:
  the frames are read on-device to decode the code, and the join code you type by
  hand is an equivalent path.
- **Photos / media library** — to pick an avatar or portrait for a character. The
  chosen image is copied into the app's private storage and stays on your device;
  images are never part of the campaign extract.

No location, microphone, or contacts access. The app may read basic,
non-identifying device information (e.g. OS version) on-device for compatibility
purposes only; this information is not transmitted or stored.

## Third-party services

The app integrates **no** third-party analytics, advertising, crash-reporting,
or tracking SDKs.

## Children's privacy

The app contains no ads and no in-app purchases, and collects no personal data
beyond the campaign extract described above, which is shared only through an
explicit, revocable action. Groups that include minors should prefer a
self-hosted server run by someone they trust.

## Data deletion

- **Local data:** delete the app or clear its data from your device's system
  settings. Deleting a table also removes its Game Master notes.
- **Campaign data:** stop sharing the character, leave the campaign, or (as
  Game Master) delete the campaign — the server erases the corresponding data
  immediately. For anything else concerning the community instance, contact
  the developer below.

## Changes to this policy

If this policy changes, the updated version will be published at the same
location with a revised "Last updated" date.

## Contact

For any question about this privacy policy, contact the developer:

- **Developer:** aehru
- **Email:** hello@aehru.fr

---

*The app and the campaign server are open source; their data handling can be
independently verified in the source code.*
