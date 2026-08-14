// Weapon formula engine for Prophecy. Formulas are short additive expressions
// mixing caracteristique references, flat integers and dice, e.g.
//   FOR x2 +3 +1D10   →  (Force × 2) + 3 + 1D10
//
// Supported grammar (kept deliberately small — see the feature spec):
//   - term separator: `+`
//   - caracteristique:      FOR            (one of the 8 carac abbreviations)
//   - caracteristique × N:  FOR x2 / FOR*2 (integer multiplier)
//   - flat integer:         3
//   - dice:                 1D10 / 2d6
//   - parentheses:          cosmetic grouping, e.g. (FOR x2) — stripped to
//     compute since the grammar has only `+` and `×` (no precedence ambiguity).
//
// Not supported (rejected at parse): multiple caracs in one term, subtraction,
// division. The raw string is what we store and display verbatim; parsing is
// only for validation (on save) and computing the character-specific result.
//
// NR (niveau de réussite) is an OPT-IN extra variable — `parseFormula(raw, {
// nr: true })`. Spell durations and target counts are written in the rulebook as
// `(1 + NR) jours`, `(30 + 30 par NR) minutes`, `3+2/NR`, which all mean the same
// shape: `flat + coef × NR`. The three spellings are accepted and normalized, so
// an author can copy the book verbatim instead of learning a syntax. It stays
// opt-in because a weapon's damage has no NR — letting it through there would
// turn a typo into a silently valid formula.
//
// SPHERE is the second opt-in variable — `{ sphere: true }`. The supplements
// scale most of their durations off the caster's sphere score: « dure (Sphère
// des vents) tours », « (Sphère de la nature × 2) tours », « une heure par point
// en Sphère des cités ». Bare `SPHERE` means THE SPELL'S OWN sphere, which is
// what every occurrence in the catalogue turned out to be — a spell of the
// Sphère des Vents never scales off another sphere. `SPHERE_VENTS` names one
// explicitly for the day one does; the name is matched loosely (accents, case,
// with or without the `sphere` prefix, singular or plural) so an author can
// write `SPHERE_VENT` or `SPHERE_Vents` and mean the same thing.

import { CARACTERISTIQUES, SPHERES } from '@/constants/prophecy';

export type FormulaTerm =
  | { kind: 'carac'; carac: string; abbr: string; mult: number }
  | { kind: 'nr'; mult: number }
  /** `sphere: null` = the spell's own sphere; otherwise a `SPHERES` key. */
  | { kind: 'sphere'; sphere: string | null; mult: number }
  | { kind: 'flat'; value: number }
  | { kind: 'dice'; count: number; sides: number };

export type ParsedFormula = { terms: FormulaTerm[] };

export type ParseResult =
  | { ok: true; formula: ParsedFormula }
  | { ok: false; error: string };

/** carac abbreviation (uppercased) → carac key, e.g. "FOR" → "force". */
const CARAC_BY_ABBR: Record<string, { key: string; abbr: string }> = Object.fromEntries(
  CARACTERISTIQUES.map((c) => [c.abbr.toUpperCase(), { key: c.key, abbr: c.abbr }]),
);

const DICE_RE = /^(\d+)\s*[dD]\s*(\d+)$/;
const CARAC_MULT_RE = /^([A-Za-zÀ-ÿ]+)\s*[x×*]\s*(\d+)$/;
const FLAT_RE = /^\d+$/;
const CARAC_RE = /^[A-Za-zÀ-ÿ]+$/;
/** Bare `NR` — checked BEFORE CARAC_RE, which would otherwise match it. */
const NR_RE = /^NR$/i;
/**
 * `NR` with a coefficient, in every spelling the rulebook uses:
 * `NR x2` (group 1) and `2 x NR` / `2 par NR` / `2/NR` (group 2). The `/` here
 * is the book's "par", NOT division — the grammar still has no division.
 */
const NR_MULT_RE = /^(?:NR\s*[x×*]\s*(\d+)|(\d+)\s*(?:[x×*]\s*NR|par\s+NR|\/\s*NR))$/i;
/** `SPHERE`, `SPHERE_VENTS`, either optionally followed by `x2`. */
const SPHERE_RE = /^SPH[EÈ]RE(?:_([A-Za-zÀ-ÿ]+))?(?:\s*[x×*]\s*(\d+))?$/i;

/** Accepted sphere spellings → canonical `SPHERES` key. */
const SPHERE_BY_NAME: Record<string, string> = (() => {
  const fold = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const out: Record<string, string> = {};
  for (const s of SPHERES) {
    const bare = s.key.replace(/^sphere/, '');
    for (const spelling of [s.key, bare, s.label]) {
      const f = fold(spelling);
      out[f] = s.key;
      // Tolerate the other number: "Vents" written "Vent", "Cites" as "Cite".
      out[f.replace(/s$/, '')] = s.key;
    }
  }
  return out;
})();

/** Parse a formula string into terms. Empty string parses to zero terms. */
export function parseFormula(input: string, { nr = false, sphere = false } = {}): ParseResult {
  const raw = (input ?? '').trim();
  if (raw === '') return { ok: true, formula: { terms: [] } };

  // Parentheses are cosmetic with only +/× — drop them before splitting.
  const cleaned = raw.replace(/[()]/g, ' ');
  const parts = cleaned.split('+').map((p) => p.trim()).filter((p) => p !== '');

  const terms: FormulaTerm[] = [];
  for (const part of parts) {
    const dice = part.match(DICE_RE);
    if (dice) {
      terms.push({ kind: 'dice', count: Number(dice[1]), sides: Number(dice[2]) });
      continue;
    }
    if (nr) {
      if (NR_RE.test(part)) {
        terms.push({ kind: 'nr', mult: 1 });
        continue;
      }
      const nrMult = part.match(NR_MULT_RE);
      if (nrMult) {
        terms.push({ kind: 'nr', mult: Number(nrMult[1] ?? nrMult[2]) });
        continue;
      }
    }
    if (sphere) {
      const sph = part.match(SPHERE_RE);
      if (sph) {
        const [, name, mult] = sph;
        if (name === undefined) {
          terms.push({ kind: 'sphere', sphere: null, mult: Number(mult ?? 1) });
          continue;
        }
        const canonical =
          SPHERE_BY_NAME[name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()];
        if (!canonical) return { ok: false, error: `Sphère inconnue : ${name}` };
        terms.push({ kind: 'sphere', sphere: canonical, mult: Number(mult ?? 1) });
        continue;
      }
    }
    const mult = part.match(CARAC_MULT_RE);
    if (mult) {
      const carac = CARAC_BY_ABBR[mult[1].toUpperCase()];
      if (!carac) return { ok: false, error: `Caractéristique inconnue : ${mult[1]}` };
      terms.push({ kind: 'carac', carac: carac.key, abbr: carac.abbr, mult: Number(mult[2]) });
      continue;
    }
    if (FLAT_RE.test(part)) {
      terms.push({ kind: 'flat', value: Number(part) });
      continue;
    }
    if (CARAC_RE.test(part)) {
      const carac = CARAC_BY_ABBR[part.toUpperCase()];
      if (!carac) return { ok: false, error: `Caractéristique inconnue : ${part}` };
      terms.push({ kind: 'carac', carac: carac.key, abbr: carac.abbr, mult: 1 });
      continue;
    }
    return { ok: false, error: `Terme invalide : « ${part} »` };
  }
  return { ok: true, formula: { terms } };
}

/**
 * Compute a parsed formula for a character. Caracteristique and flat terms fold
 * into a single static total; dice terms stay symbolic (no RNG — we never roll).
 *
 * `nr` folds NR terms in the same way. Leave it undefined and they stay symbolic
 * too, returned in `nrTerms` — that is the "spell not cast yet" reading, where
 * a durée must still display as « 1 + NR jours ». `sphereValue` does the same
 * for SPHERE terms: return a number to fold it in, or null/undefined to leave it
 * symbolic (a caller that only knows the spell's OWN sphere answers for `null`
 * and declines the named ones).
 */
export function computeFormula(
  formula: ParsedFormula,
  caracValue: (caracKey: string) => number,
  // Optional per-caractéristique modifier (wound malus + temporary effects),
  // folded into the carac value BEFORE the multiplier: e.g. FOR 5 with -1 in a
  // `FOR x2` term gives (5-1)*2 = 8, not 5*2-1 = 9.
  caracModifier?: (caracKey: string) => number,
  nr?: number | null,
  sphereValue?: (sphereKey: string | null) => number | null | undefined,
): {
  staticTotal: number;
  dice: { count: number; sides: number }[];
  nrTerms: { mult: number }[];
  sphereTerms: { sphere: string | null; mult: number }[];
} {
  let staticTotal = 0;
  const dice: { count: number; sides: number }[] = [];
  const nrTerms: { mult: number }[] = [];
  const sphereTerms: { sphere: string | null; mult: number }[] = [];
  for (const t of formula.terms) {
    if (t.kind === 'flat') staticTotal += t.value;
    else if (t.kind === 'carac') {
      const base = caracValue(t.carac) + (caracModifier?.(t.carac) ?? 0);
      staticTotal += base * t.mult;
    } else if (t.kind === 'nr') {
      if (nr == null) nrTerms.push({ mult: t.mult });
      else staticTotal += nr * t.mult;
    } else if (t.kind === 'sphere') {
      const v = sphereValue?.(t.sphere);
      if (v == null) sphereTerms.push({ sphere: t.sphere, mult: t.mult });
      else staticTotal += v * t.mult;
    } else dice.push({ count: t.count, sides: t.sides });
  }
  return { staticTotal, dice, nrTerms, sphereTerms };
}

/**
 * Resolve a raw formula string to a display string for a character, e.g.
 * `FOR x2 +3 +1D10` with Force 4 → "11 + 1D10". Returns null for an empty
 * formula. Invalid formulas fall back to the raw string (so a half-typed value
 * still shows something rather than vanishing).
 */
export function formulaResult(
  raw: string | null | undefined,
  caracValue: (caracKey: string) => number,
  caracModifier?: (caracKey: string) => number,
): string | null {
  if (raw == null || raw.trim() === '') return null;
  const parsed = parseFormula(raw);
  if (!parsed.ok) return raw.trim();
  const { staticTotal, dice } = computeFormula(parsed.formula, caracValue, caracModifier);
  const parts: string[] = [];
  if (dice.length === 0 || staticTotal !== 0) parts.push(String(staticTotal));
  for (const d of dice) parts.push(`${d.count}D${d.sides}`);
  return parts.join(' + ');
}

/** Sphere key → the accented label a symbolic term prints. */
const SPHERE_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  SPHERES.map((s) => [s.key, s.label]),
);

/**
 * Resolve a spell formula (a durée or a nombre de cibles) to a display string.
 * Both variables resolve independently, and whichever is still unknown stays
 * symbolic — so a durée reads « 1 + NR jours » before the roll, « Sphère tours »
 * with no character in context, and a plain number once both are known. Returns
 * null for an empty formula; an unparseable one falls back to its raw text, like
 * `formulaResult`.
 */
export function spellFormulaResult(
  raw: string | null | undefined,
  {
    nr,
    sphere,
  }: {
    nr?: number | null;
    /** Answer for `null` (the spell's own sphere); return null to stay symbolic. */
    sphere?: (sphereKey: string | null) => number | null | undefined;
  } = {},
): string | null {
  if (raw == null || raw.trim() === '') return null;
  const parsed = parseFormula(raw, { nr: true, sphere: true });
  if (!parsed.ok) return raw.trim();
  const { staticTotal, dice, nrTerms, sphereTerms } = computeFormula(
    parsed.formula,
    () => 0,
    undefined,
    nr,
    sphere,
  );

  const symbolic = nrTerms.length + sphereTerms.length;
  const parts: string[] = [];
  // A lone variable must not print a leading "0"; a lone `0` still has to show.
  if (staticTotal !== 0 || (symbolic === 0 && dice.length === 0)) parts.push(String(staticTotal));
  for (const t of sphereTerms) {
    const name = t.sphere == null ? 'Sphère' : `Sphère ${SPHERE_LABEL_BY_KEY[t.sphere]}`;
    parts.push(t.mult === 1 ? name : `${name} × ${t.mult}`);
  }
  for (const t of nrTerms) parts.push(t.mult === 1 ? 'NR' : `${t.mult} × NR`);
  for (const d of dice) parts.push(`${d.count}D${d.sides}`);
  return parts.join(' + ');
}

export type Prerequisite = { carac: string; abbr: string; min: number };

/**
 * Parse a prerequisites string like `FOR 4, COO 5` into structured requirements.
 * Unknown/garbled segments are skipped (kept lenient — prerequisites are free
 * enough that we don't want to block saving a weapon on a typo).
 */
export function parsePrerequisites(input: string | null | undefined): Prerequisite[] {
  if (input == null) return [];
  const out: Prerequisite[] = [];
  for (const seg of input.split(/[,;]/)) {
    const m = seg.trim().match(/^([A-Za-zÀ-ÿ]+)\s*(\d+)$/);
    if (!m) continue;
    const carac = CARAC_BY_ABBR[m[1].toUpperCase()];
    if (!carac) continue;
    out.push({ carac: carac.key, abbr: carac.abbr, min: Number(m[2]) });
  }
  return out;
}
