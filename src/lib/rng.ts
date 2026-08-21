/**
 * Seeded pseudo-random source + the small picks built on it.
 *
 * `lib/dice` already rolls real dice with an injectable `Rng`, and that stays
 * the roller. This module answers a different need: the NPC generator makes
 * dozens of correlated choices (a carac, then a jitter, then a name syllable),
 * and a test has to be able to assert the WHOLE result. A seeded generator
 * gives that without stubbing `Math.random` globally, and lets the UI offer a
 * « Relancer » that visibly changes everything by changing one seed.
 *
 * mulberry32 rather than a library: 12 lines, no dependency, and its quality is
 * far past what picking a syllable needs. Deliberately NOT cryptographic —
 * nothing here protects anything (see `lib/uuid` for the id path).
 *
 * Pure — no framework imports, loads in plain-Node vitest.
 */

/** A source of numbers in [0, 1). Same shape `lib/dice` injects. */
export type Rng = () => number;

/** Any string → a 32-bit seed. FNV-1a: short, stable, no dependency. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A generator that replays identically for the same seed. Callers pass a STRING
 * seed (`"garde-1"`, a uuid, a timestamp) so a seed can be something meaningful
 * rather than a number someone has to invent.
 */
export function seededRng(seed: string): Rng {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh, unseeded-looking seed — for the "roll me something" entry point. */
export function randomSeed(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(36)}`;
}

/** Integer in [min, max], both inclusive. Reversed bounds are swapped, not thrown. */
export function randomInt(rng: Rng, min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** One item from a list. Empty list → undefined (callers decide what that means). */
export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

/** True with probability `p` (clamped to [0, 1]). */
export function chance(rng: Rng, p: number): boolean {
  return rng() < Math.min(1, Math.max(0, p));
}

/**
 * A jitter in [-spread, +spread], centered — the shape the generator wants for
 * "roughly this value". Built from TWO draws rather than one uniform pick so the
 * extremes stay rare: a variance dial should mostly nudge, occasionally surprise.
 */
export function jitter(rng: Rng, spread: number): number {
  const s = Math.max(0, Math.floor(spread));
  if (s === 0) return 0;
  return randomInt(rng, 0, s) - randomInt(rng, 0, s);
}
