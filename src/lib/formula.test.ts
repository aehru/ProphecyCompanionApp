import { describe, expect, it } from 'vitest';

import {
  computeFormula,
  formulaResult,
  parseFormula,
  parsePrerequisites,
} from './formula';

// A character with a couple of caractéristiques set; everything else 0.
const caracValue = (values: Record<string, number>) => (key: string) => values[key] ?? 0;

describe('parseFormula', () => {
  it('parses the empty string to zero terms', () => {
    const r = parseFormula('');
    expect(r).toEqual({ ok: true, formula: { terms: [] } });
  });

  it('parses whitespace-only to zero terms', () => {
    const r = parseFormula('   ');
    expect(r.ok && r.formula.terms).toEqual([]);
  });

  it('parses the canonical FOR x2 +3 +1D10', () => {
    const r = parseFormula('FOR x2 +3 +1D10');
    expect(r).toEqual({
      ok: true,
      formula: {
        terms: [
          { kind: 'carac', carac: 'force', abbr: 'FOR', mult: 2 },
          { kind: 'flat', value: 3 },
          { kind: 'dice', count: 1, sides: 10 },
        ],
      },
    });
  });

  it('accepts * and × as multiplier signs', () => {
    const star = parseFormula('FOR*2');
    const times = parseFormula('FOR×2');
    expect(star.ok && star.formula.terms[0]).toMatchObject({ kind: 'carac', mult: 2 });
    expect(times.ok && times.formula.terms[0]).toMatchObject({ kind: 'carac', mult: 2 });
  });

  it('parses a bare caractéristique with an implicit ×1', () => {
    const r = parseFormula('COO');
    expect(r.ok && r.formula.terms[0]).toEqual({
      kind: 'carac',
      carac: 'coordination',
      abbr: 'COO',
      mult: 1,
    });
  });

  it('parses lowercase dice (2d6)', () => {
    const r = parseFormula('2d6');
    expect(r.ok && r.formula.terms[0]).toEqual({ kind: 'dice', count: 2, sides: 6 });
  });

  it('strips cosmetic parentheses', () => {
    const r = parseFormula('(FOR x2) +1');
    expect(r.ok && r.formula.terms).toEqual([
      { kind: 'carac', carac: 'force', abbr: 'FOR', mult: 2 },
      { kind: 'flat', value: 1 },
    ]);
  });

  it('rejects an unknown caractéristique (multiplied)', () => {
    const r = parseFormula('XXX x2');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/inconnue/i);
  });

  it('rejects an unknown caractéristique (bare)', () => {
    const r = parseFormula('XYZ');
    expect(r.ok).toBe(false);
  });

  it('rejects an unsupported term (subtraction)', () => {
    const r = parseFormula('FOR-2');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/invalide/i);
  });
});

describe('computeFormula', () => {
  it('folds carac and flat terms into a static total, keeps dice symbolic', () => {
    const parsed = parseFormula('FOR x2 +3 +1D10');
    if (!parsed.ok) throw new Error('fixture should parse');
    const { staticTotal, dice } = computeFormula(parsed.formula, caracValue({ force: 4 }));
    expect(staticTotal).toBe(11); // 4*2 + 3
    expect(dice).toEqual([{ count: 1, sides: 10 }]);
  });

  it('applies the modifier to the carac value BEFORE the multiplier', () => {
    const parsed = parseFormula('FOR x2 +3');
    if (!parsed.ok) throw new Error('fixture should parse');
    // (5 - 1) * 2 + 3 = 11, NOT 5*2 - 1 + 3 = 12.
    const { staticTotal } = computeFormula(
      parsed.formula,
      caracValue({ force: 5 }),
      () => -1,
    );
    expect(staticTotal).toBe(11);
  });

  it('returns a zero static total for a dice-only formula', () => {
    const parsed = parseFormula('1D10');
    if (!parsed.ok) throw new Error('fixture should parse');
    const { staticTotal, dice } = computeFormula(parsed.formula, caracValue({}));
    expect(staticTotal).toBe(0);
    expect(dice).toEqual([{ count: 1, sides: 10 }]);
  });
});

describe('formulaResult', () => {
  it('returns null for an empty or nullish formula', () => {
    expect(formulaResult('', caracValue({}))).toBeNull();
    expect(formulaResult(null, caracValue({}))).toBeNull();
    expect(formulaResult(undefined, caracValue({}))).toBeNull();
  });

  it('renders the computed static total plus symbolic dice', () => {
    expect(formulaResult('FOR x2 +3 +1D10', caracValue({ force: 4 }))).toBe('11 + 1D10');
  });

  it('omits a zero static total when there is a dice term', () => {
    expect(formulaResult('1D10', caracValue({}))).toBe('1D10');
  });

  it('keeps a zero static total when there is no dice term', () => {
    expect(formulaResult('FOR x0', caracValue({ force: 4 }))).toBe('0');
  });

  it('falls back to the raw string for an invalid formula', () => {
    expect(formulaResult('  FOR-2  ', caracValue({ force: 4 }))).toBe('FOR-2');
  });

  it('folds the modifier into the rendered result', () => {
    // FOR 5, modifier -1, ×2 → (5-1)*2 = 8.
    expect(formulaResult('FOR x2', caracValue({ force: 5 }), () => -1)).toBe('8');
  });
});

describe('parsePrerequisites', () => {
  it('returns an empty list for null', () => {
    expect(parsePrerequisites(null)).toEqual([]);
    expect(parsePrerequisites(undefined)).toEqual([]);
  });

  it('parses comma-separated requirements', () => {
    expect(parsePrerequisites('FOR 4, COO 5')).toEqual([
      { carac: 'force', abbr: 'FOR', min: 4 },
      { carac: 'coordination', abbr: 'COO', min: 5 },
    ]);
  });

  it('accepts semicolons as separators', () => {
    expect(parsePrerequisites('FOR 4; RES 2')).toEqual([
      { carac: 'force', abbr: 'FOR', min: 4 },
      { carac: 'resistance', abbr: 'RES', min: 2 },
    ]);
  });

  it('skips garbled or unknown segments leniently', () => {
    // "blah" has no number; "XYZ 3" is an unknown carac — both dropped.
    expect(parsePrerequisites('FOR 4, blah, XYZ 3')).toEqual([
      { carac: 'force', abbr: 'FOR', min: 4 },
    ]);
  });
});
