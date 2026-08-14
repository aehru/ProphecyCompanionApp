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

import { CARACTERISTIQUES } from '@/constants/prophecy';

export type FormulaTerm =
  | { kind: 'carac'; carac: string; abbr: string; mult: number }
  | { kind: 'nr'; mult: number }
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

/** Parse a formula string into terms. Empty string parses to zero terms. */
export function parseFormula(input: string, { nr = false } = {}): ParseResult {
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
 * a durée must still display as « 1 + NR jours ».
 */
export function computeFormula(
  formula: ParsedFormula,
  caracValue: (caracKey: string) => number,
  // Optional per-caractéristique modifier (wound malus + temporary effects),
  // folded into the carac value BEFORE the multiplier: e.g. FOR 5 with -1 in a
  // `FOR x2` term gives (5-1)*2 = 8, not 5*2-1 = 9.
  caracModifier?: (caracKey: string) => number,
  nr?: number | null,
): {
  staticTotal: number;
  dice: { count: number; sides: number }[];
  nrTerms: { mult: number }[];
} {
  let staticTotal = 0;
  const dice: { count: number; sides: number }[] = [];
  const nrTerms: { mult: number }[] = [];
  for (const t of formula.terms) {
    if (t.kind === 'flat') staticTotal += t.value;
    else if (t.kind === 'carac') {
      const base = caracValue(t.carac) + (caracModifier?.(t.carac) ?? 0);
      staticTotal += base * t.mult;
    } else if (t.kind === 'nr') {
      if (nr == null) nrTerms.push({ mult: t.mult });
      else staticTotal += nr * t.mult;
    } else dice.push({ count: t.count, sides: t.sides });
  }
  return { staticTotal, dice, nrTerms };
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

/**
 * Resolve an NR-bearing formula (a spell's durée or nombre de cibles) to a
 * display string. Pass the achieved `nr` to get a plain number — « 4 » — and
 * leave it null before the roll to keep it symbolic — « 1 + NR ». Returns null
 * for an empty formula; an unparseable one falls back to its raw text, like
 * `formulaResult`.
 */
export function nrFormulaResult(raw: string | null | undefined, nr?: number | null): string | null {
  if (raw == null || raw.trim() === '') return null;
  const parsed = parseFormula(raw, { nr: true });
  if (!parsed.ok) return raw.trim();
  const { staticTotal, dice, nrTerms } = computeFormula(parsed.formula, () => 0, undefined, nr);

  const parts: string[] = [];
  // A lone `NR` must not print a leading "0"; a lone `0` still has to show.
  if (staticTotal !== 0 || (nrTerms.length === 0 && dice.length === 0)) {
    parts.push(String(staticTotal));
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
