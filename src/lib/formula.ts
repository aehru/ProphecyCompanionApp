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
import { fold } from '@/lib/text-fold';

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
/**
 * `SPHERE`, `SPHERE_VENTS`, `SPHERE_DES_VENTS`, any optionally followed by `x2`.
 * The name is captured loosely — separators and articles are sorted out by
 * `sphereLookupKey`, not by the regex.
 */
const SPHERE_RE = /^SPH[EÈ]RE(?:[_ ]([A-Za-zÀ-ÿ_ ]+?))?(?:\s*[x×*]\s*(\d+))?$/i;

/**
 * Collapse a sphere spelling to its lookup key, so every plausible way of naming
 * one lands on the same entry: `VENTS`, `VENT`, `DES_VENTS`, `sphereVents` and
 * `Vents` all reduce to `vent`. Drops accents, separators, French articles, the
 * `sphere` prefix and a trailing plural.
 */
const sphereLookupKey = (s: string) =>
  fold(s)
    .replace(/[_\s]+/g, ' ')
    .replace(/\b(?:de|des|du|la|le|les|l)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^sphere/, '')
    .replace(/s$/, '');

/** Accepted sphere spellings → canonical `SPHERES` key. */
const SPHERE_BY_NAME: Record<string, string> = Object.fromEntries(
  SPHERES.flatMap((s) => [s.key, s.label].map((spelling) => [sphereLookupKey(spelling), s.key])),
);

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
        const canonical = SPHERE_BY_NAME[sphereLookupKey(name)];
        if (!canonical) return { ok: false, error: `Sphère inconnue : ${name}` };
        terms.push({ kind: 'sphere', sphere: canonical, mult: Number(mult ?? 1) });
        continue;
      }
    }
    // Name the real problem before CARAC_RE swallows the word and reports an
    // unknown caractéristique — a weapon typo would otherwise send the author
    // hunting for a stat that was never the point.
    if (!nr && (NR_RE.test(part) || NR_MULT_RE.test(part))) {
      return { ok: false, error: `NR n'est utilisable que dans une formule de sortilège` };
    }
    if (!sphere && SPHERE_RE.test(part)) {
      return { ok: false, error: `SPHERE n'est utilisable que dans une formule de sortilège` };
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

/** Sphere key → the accented label a symbolic term prints. */
const SPHERE_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  SPHERES.map((s) => [s.key, s.label]),
);

/**
 * Everything a formula's variables can be resolved against — ONE bag passed to
 * `computeFormula`/`formulaResult`, whatever the formula is for. A weapon fills
 * `carac`, a spell durée fills `nr`/`sphere`, a caller holding both fills both;
 * the engine never asks what kind of thing it is computing.
 *
 * Every resolver may DECLINE — return null/undefined — and the term then stays
 * symbolic instead of silently counting as zero. That is what lets one function
 * render « Sphère tours » with no character, « 1 + NR jours » before the roll,
 * and a plain number once everything is known.
 */
export interface FormulaVars {
  /** A caractéristique's value on the sheet. */
  carac?: (caracKey: string) => number | null | undefined;
  /**
   * Wound malus + temporary effects for a caractéristique, folded into its value
   * BEFORE the multiplier: FOR 5 with -1 in a `FOR x2` term gives (5-1)*2 = 8,
   * not 5*2-1 = 9. Only consulted when `carac` answered.
   */
  caracModifier?: (caracKey: string) => number;
  /** The niveau de réussite the player rolled. */
  nr?: number | null;
  /** Answers for `null` (the spell's OWN sphere) and/or a named `SPHERES` key. */
  sphere?: (sphereKey: string | null) => number | null | undefined;
}

export interface ComputedFormula {
  /** Every term that reduced to a number, summed. */
  total: number;
  /**
   * Terms left symbolic, in source order: dice always (we never roll), plus any
   * variable whose resolver declined.
   */
  symbolic: FormulaTerm[];
}

/**
 * Reduce a parsed formula against `vars`. Terms whose variable resolves fold
 * into `total`; the rest come back in `symbolic` for the caller to print.
 */
export function computeFormula(formula: ParsedFormula, vars: FormulaVars = {}): ComputedFormula {
  let total = 0;
  const symbolic: FormulaTerm[] = [];
  for (const t of formula.terms) {
    switch (t.kind) {
      case 'flat':
        total += t.value;
        break;
      case 'carac': {
        const v = vars.carac?.(t.carac);
        if (v == null) symbolic.push(t);
        else total += (v + (vars.caracModifier?.(t.carac) ?? 0)) * t.mult;
        break;
      }
      case 'nr':
        if (vars.nr == null) symbolic.push(t);
        else total += vars.nr * t.mult;
        break;
      case 'sphere': {
        const v = vars.sphere?.(t.sphere);
        if (v == null) symbolic.push(t);
        else total += v * t.mult;
        break;
      }
      default:
        symbolic.push(t); // dice — never resolvable, we never roll
    }
  }
  return { total, symbolic };
}

/** How an unresolved term prints: `FOR × 2`, `Sphère × 2`, `3 × NR`, `1D10`. */
export function formulaTermLabel(t: FormulaTerm): string {
  switch (t.kind) {
    case 'carac':
      return t.mult === 1 ? t.abbr : `${t.abbr} × ${t.mult}`;
    case 'nr':
      return t.mult === 1 ? 'NR' : `${t.mult} × NR`;
    case 'sphere': {
      const name = t.sphere == null ? 'Sphère' : `Sphère ${SPHERE_LABEL_BY_KEY[t.sphere]}`;
      return t.mult === 1 ? name : `${name} × ${t.mult}`;
    }
    case 'dice':
      return `${t.count}D${t.sides}`;
    // Never reached — a flat term always folds into the total — but spelled out
    // so TypeScript flags this switch the day a sixth term kind lands.
    case 'flat':
      return String(t.value);
  }
}

/**
 * Resolve a raw formula to a display string — the ONE renderer, weapons and
 * spells alike. `FOR x2 +3 +1D10` with Force 4 gives "11 + 1D10"; a durée
 * `SPHERE + 3 par NR` gives "Sphère + 3 × NR", "5 + 3 × NR" or "11" depending on
 * what `vars` could answer. Returns null for an empty formula; an invalid one
 * falls back to its raw text, so a half-typed value still shows something rather
 * than vanishing.
 *
 * `parse` opts into the spell variables — the same guard `parseFormula` takes,
 * so a weapon still rejects `NR`/`SPHERE` as typos.
 */
export function formulaResult(
  raw: string | null | undefined,
  vars: FormulaVars = {},
  parse: { nr?: boolean; sphere?: boolean } = {},
): string | null {
  if (raw == null || raw.trim() === '') return null;
  const parsed = parseFormula(raw, parse);
  if (!parsed.ok) return raw.trim();
  const { total, symbolic } = computeFormula(parsed.formula, vars);

  const parts: string[] = [];
  // A lone symbol must not print a leading "0"; a lone `0` still has to show.
  if (total !== 0 || symbolic.length === 0) parts.push(String(total));
  for (const t of symbolic) parts.push(formulaTermLabel(t));
  return parts.join(' + ');
}

/**
 * `formulaResult` with both spell variables enabled — a spell's durée or its
 * nombre de cibles. Same `vars` bag: pass whichever resolvers you hold, and the
 * rest stays symbolic.
 */
export function spellFormulaResult(
  raw: string | null | undefined,
  vars: FormulaVars = {},
): string | null {
  return formulaResult(raw, vars, { nr: true, sphere: true });
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
