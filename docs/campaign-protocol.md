# Campaign wire protocol (v2)

The contract between the app ([src/lib/campaign-protocol.ts](../src/lib/campaign-protocol.ts),
[src/lib/character-share.ts](../src/lib/character-share.ts)) and the
self-hostable relay server ([ProphecyCompanionServer](https://github.com/aehru/ProphecyCompanionServer),
`app/schemas.py` — the two languages are **hand-synced**: any change here must land
in both repos).

- **`PROTOCOL_VERSION = 2`** — hard break from v1 (checked on the hello, §3).
- **`SHARED_SCHEMA_VERSION = 2`** — the `SharedCharacter` payload shape (§2), unchanged by protocol v2.

## 1. Transport

- REST for campaign lifecycle (create/delete), WebSocket (`/ws`) for everything live.
- Everything on the wire is **camelCase JSON**, one message per text frame.
- Frame size cap: 64 KiB (`too_big` error). Non-JSON frames: `bad_json`.
- Scheme is derived from the host, never typed by the user: LAN hosts (bare IPv4,
  `localhost`, `.local`) get `ws://`/`http://`, anything else `wss://`/`https://`
  (`wsUrl`/`httpUrl` in campaign-protocol.ts).

## 2. The projection (`SharedCharacter`) — the privacy boundary

`toSharedCharacter` (character-share.ts) emits ONLY: `nom`, caractéristiques,
attributs, tendances, wounds (current/max), resources (maîtrise/chance),
initiative, conditions, trained `skills` (value > 0), active non-expired
`effects`. **Excluded on purpose:** concept, biographie, notes, money, magic,
untrained skills, expired effects. A data-minimization test fails if the wire
widens beyond the allowed set. The server stores the projection as **opaque
JSON** (latest only, UPSERT, no history) and never validates it deeply — a newer
app can add fields without breaking an older server (tolerant reader, both
directions).

## 3. Hello & version gate

The first frame on a socket must be a `hello`. **v2: the hello identifies the
SESSION (device), not a character** — one socket may share N characters.

```json
{"v": 2, "type": "hello", "role": "player", "code": "ABCD2345"}
{"v": 2, "type": "hello", "role": "gm", "code": "ABCD2345", "gmToken": "<uuid>"}
```

- `v != 2` → `error(code="unsupported_version")` + close. This is the only place
  `v` is enforced.
- Unknown `code` → `no_campaign`. Bad `gmToken` (hash compare) → `forbidden`.
- Reply: `{"v":2,"type":"welcome","campaign":{"code","name"},"role"}`. A GM then
  receives the full persisted `roster` (§5). A player hello triggers **no
  presence** — the session owns no character until it shares (§6).

## 4. Sharing (client → server)

```json
{"v": 2, "type": "share", "charId": "<char-uuid>", "character": { ...SharedCharacter }}
{"v": 2, "type": "unshare", "charId": "<char-uuid>"}
{"v": 2, "type": "ping"}
```

- `charId` = the character's portable uuid (`characters.uuid` app-side) — it
  survives device changes, so roster and GM notes re-link after a phone swap.
- Sharing N characters = N ordinary `share` frames on the one socket. Each
  UPSERTs its projection row and stamps `owner` from the sender's role
  (`"gm"` = a GM-run PNJ). A re-share by the other role flips `owner`.
- New roster slots are refused at capacity (16, `campaign_full`); updates of an
  existing slot always pass.
- `unshare` purges the projection row (right-to-erasure) and is **idempotent**.
- **The GM's kick IS an `unshare`** sent from the GM socket (see §7).

## 5. Server → client stream (GM sockets only)

```json
{"v":2,"type":"roster","characters":[{"charId","character":{...},"online":true,"updatedAt":1753,"owner":"gm"}]}
{"v":2,"type":"update","charId":"...","character":{...},"updatedAt":1753,"owner":"player"}
{"v":2,"type":"remove","charId":"..."}
{"v":2,"type":"presence","charId":"...","online":false}
{"v":2,"type":"pong"}
{"v":2,"type":"error","code":"...","message":"..."}
```

- Players never receive the roster — it fans out to GM-role sockets only.
- `owner` (`"gm" | "player"`, v2) lets the GM UI badge their own PNJs. The app's
  parser tolerates a missing/unknown value (defaults to `"player"`).
- The app's reader is tolerant (§2): unknown message types parse to `unknown`
  and are ignored; `character` payloads pass through opaquely.

## 6. Presence semantics (v2)

- Each socket carries the set of charIds it has shared; room-wide "online" is
  the **union across live sockets**.
- **Online is implied by `update`** — the GM folds any update into
  `online: true` (there is no presence-online frame on hello anymore). The app's
  first push after each (re)connect is immediate, so a reconnect flips a
  character online right away.
- On disconnect the server emits `presence(online=false)` **per charId** the
  socket held — unless another live socket still holds that charId (the
  reconnect race: the new socket re-shared before the stale one was reaped).
  GM broadcaster sockets report their PNJs offline the same way.
- Quirk (accepted): after a kick, the kicked owner's socket still holds its
  claim; its eventual disconnect emits a presence for an entry no longer in the
  roster. The GM client maps presence onto existing entries only — a no-op.

## 7. Security model

- **The join code is the room capability.** Anyone holding it may connect as a
  player; the GM additionally proves ownership with the `gmToken` (server stores
  only its SHA-256 hash).
- **Within a room, all members share one write domain:** any authenticated
  member may `share` or `unshare` any charId. v1 was equally open (any client
  knowing the code could hello as any charId), so this is not a widening — and
  it is what makes the GM's kick free.
- Kick = purge only, **no ban**: a kicked character re-appears on its owner's
  next share. Durable moderation = rotating the campaign (new code).
- Caps stay: 16 projections/campaign, 64 KiB/frame, create rate-limit per IP.

## 8. Lifecycle summaries

- **Player multi-share (app side):** `campaign_shares` rows drive one
  role-aware socket (use-campaign-live.tsx). Per-character in-play signature,
  shared 5 s debounce; first frame per character after (re)connect immediate.
  Unchecking while live sends `unshare` on the live socket; unchecking while
  paused fires a short-lived purge socket (`unshareFromServer`). **Stop = pause**
  (last state stays on the server); erasure = leave campaign.
- **GM PNJs:** same flow, `gmHello` — entries arrive stamped `owner: "gm"`.
  The GM device may hold two sockets (roster + broadcaster); see ROADMAP.
- **Leave/delete (right to erasure):** player leave unshares every shared
  character; GM delete removes the campaign server-side (`DELETE
  /campaigns/{code}` with the gmToken; FK cascade purges all projections).

## 9. REST

- `POST /campaigns` `{name, gmToken}` → `201 {campaignId, code}` (server mints
  the Crockford-base32 code; rate-limited per IP).
- `DELETE /campaigns/{code}` `{gmToken}` → `204` (`403` bad token, `404`
  unknown code).

## 10. Error codes

| code | meaning |
|---|---|
| `unsupported_version` | hello `v != 2` — update the app |
| `bad_hello` / `bad_json` / `too_big` / `unknown_type` | malformed traffic |
| `no_campaign` | unknown join code |
| `forbidden` | bad gmToken |
| `bad_share` / `bad_unshare` | invalid share/unshare frame |
| `campaign_full` | new slot refused at capacity |
