// The app's ONE text fold: lowercase, accents stripped.
//
// It exists because French is the UI language and nobody reaches for the
// accented keyboard to filter a list: « epee » must find « Épée ardente », and
// « Equitation » must match « Équitation ». Every search box, every loose enum
// lookup and every name comparison in the app goes through here, so a player
// never has to learn which field is picky.
//
// The combining-mark RANGE rather than `\p{Diacritic}`: it is the Latin block we
// actually need and it needs no unicode-property support from the engine.
// `localeCompare` is deliberately NOT used for the comparisons built on this —
// it reads the engine's Intl data, which differs between Hermes and the Node
// test runner. Ordering that must be true French collation asks for it
// explicitly, at the call site.
//
// Pure — no framework imports, like the other engines in lib/.

/** Lowercase, accents stripped. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * The same, for something a user typed: surrounding whitespace is never part of
 * what they meant, so `'  Épée '` and `'epee'` are the same query.
 */
export function foldQuery(s: string): string {
  return fold(s.trim());
}
