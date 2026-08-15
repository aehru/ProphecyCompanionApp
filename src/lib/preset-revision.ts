// A content fingerprint for a catalogue preset — "has this entry changed since
// the player copied it into their sheet?" in twelve characters.
//
// A spell row keeps the `presetId` it was picked from plus the `presetRevision`
// current at that moment (`db/schema.ts`). When a rulebook correction lands in
// `data-src/spells.csv`, the regenerated preset carries a different revision and
// the two stop matching — that inequality is the whole signal a future "mettre à
// jour depuis le catalogue" flow needs, with nothing to maintain by hand.
//
// Why a hash and not a version/date column in the CSV: an authored number has to
// be bumped by whoever edits the row, and the one time it is forgotten the
// correction reaches no one — silently, since nothing can detect the omission.
// The hash is derived from the content itself, so it cannot drift from it.
//
// Computed at BUILD time (`scripts/build-catalogs.ts`) and baked into the
// `.gen.ts` files: the app never recomputes it, the value stays diffable in git,
// and `src/data/catalog.test.ts` already fails when a committed .gen drifts from
// its CSV. Dependency-free for the same reason as `lib/uuid.ts` — the generator
// and vitest both load this in plain Node.

/**
 * Stable textual form of a value: object keys sorted, `undefined` entries
 * dropped so an omitted optional field and an absent one hash alike (the
 * generator omits the convenience layer when empty).
 */
function canonical(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((k) => record[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(record[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** FNV-1a, 64-bit. BigInt is fine here: this runs ~330 times, at build time. */
function fnv1a64(input: string): string {
  const PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash ^ BigInt(input.charCodeAt(i))) * PRIME) & MASK;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Fingerprint a preset's `data` — the payload actually copied onto a character
 * row. The preset's `id` is deliberately NOT part of it: the id is the identity,
 * not the content, and changing one means the old preset is gone rather than
 * corrected. Editorial columns that never reach `data` (`rulebook`) are excluded
 * for the same reason — retagging which supplement a spell came from must not
 * flag it as corrected on every sheet that holds it.
 *
 * `tags` are sorted before hashing: they are a set, so reordering the cell in
 * the spreadsheet changes nothing about the spell.
 */
export function presetRevision(data: Record<string, unknown>): string {
  const normalized: Record<string, unknown> = { ...data };
  const tags = normalized.tags;
  if (Array.isArray(tags)) normalized.tags = [...(tags as string[])].sort();
  return fnv1a64(canonical(normalized)).slice(0, 12);
}
