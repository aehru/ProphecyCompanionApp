// A dependency-free RFC-4122 v4 UUID generator.
//
// Deliberately does NOT import a native module (e.g. expo-crypto): `schema.ts`
// references this from a drizzle `$defaultFn`, and `schema.ts` is loaded by
// `drizzle-kit generate` and by vitest — both in plain Node. A native import
// there would break migration generation and the test suite.
//
// It prefers `crypto.getRandomValues` (present in Node 18+, web, and React
// Native once a polyfill is installed) and falls back to `Math.random` on bare
// Hermes. The fallback is fine for uniqueness (122 random bits) but is NOT
// cryptographically strong — `charUuid` doubles as a per-slot write capability
// (see docs/campaign-protocol.md), so when the campaign networking layer lands
// (and pulls in a real crypto dep anyway) this should switch to a CSPRNG.

type MaybeCrypto = { getRandomValues?: (a: Uint8Array) => Uint8Array };

function randomBytes16(): Uint8Array {
  const bytes = new Uint8Array(16);
  const c = (globalThis as { crypto?: MaybeCrypto }).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/** Generate a random RFC-4122 version-4 UUID (lowercase, 8-4-4-4-12). */
export function newUuid(): string {
  const b = randomBytes16();
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
}
