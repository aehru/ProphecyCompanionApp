import { describe, expect, it } from 'vitest';

import {
  computeFormula,
  formulaResult,
  spellFormulaResult,
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

describe('NR terms', () => {
  it('rejects NR unless opted in', () => {
    // Weapons must not accept it: `CARAC_RE` would otherwise match "NR" and
    // report an unknown caractéristique, so assert the message too.
    const r = parseFormula('1 + NR');
    expect(r.ok).toBe(false);
  });

  it('parses a bare NR as coefficient 1', () => {
    const r = parseFormula('1 + NR', { nr: true });
    expect(r).toEqual({
      ok: true,
      formula: { terms: [{ kind: 'flat', value: 1 }, { kind: 'nr', mult: 1 }] },
    });
  });

  it('accepts every spelling the rulebook uses for a coefficient', () => {
    // "30 par NR", "30/NR", "30 x NR" and "NR x30" all mean 30 per NR.
    for (const raw of ['30 par NR', '30/NR', '30 x NR', 'NR x30']) {
      const r = parseFormula(raw, { nr: true });
      expect(r, raw).toEqual({ ok: true, formula: { terms: [{ kind: 'nr', mult: 30 }] } });
    }
  });

  it('folds NR into the static total when a value is given', () => {
    const parsed = parseFormula('30 + 30 par NR', { nr: true });
    if (!parsed.ok) throw new Error(parsed.error);
    const { staticTotal, nrTerms } = computeFormula(parsed.formula, caracValue({}), undefined, 3);
    expect(staticTotal).toBe(120);
    expect(nrTerms).toEqual([]);
  });

  it('keeps NR symbolic when no value is given', () => {
    const parsed = parseFormula('1 + NR', { nr: true });
    if (!parsed.ok) throw new Error(parsed.error);
    const { staticTotal, nrTerms } = computeFormula(parsed.formula, caracValue({}));
    expect(staticTotal).toBe(1);
    expect(nrTerms).toEqual([{ mult: 1 }]);
  });
});

describe('SPHERE terms', () => {
  it('rejects SPHERE unless opted in', () => {
    expect(parseFormula('SPHERE').ok).toBe(false);
    expect(parseFormula('SPHERE', { nr: true }).ok).toBe(false);
  });

  it('parses a bare SPHERE as the spell’s own sphere', () => {
    const r = parseFormula('SPHERE', { sphere: true });
    expect(r).toEqual({
      ok: true,
      formula: { terms: [{ kind: 'sphere', sphere: null, mult: 1 }] },
    });
  });

  it('parses a multiplier', () => {
    const r = parseFormula('SPHERE x2', { sphere: true });
    expect(r.ok && r.formula.terms[0]).toEqual({ kind: 'sphere', sphere: null, mult: 2 });
  });

  it('accepts a named sphere in any spelling', () => {
    // Accents, case, the `sphere` prefix and the plural are all optional.
    for (const raw of ['SPHERE_VENTS', 'SPHERE_VENT', 'sphere_vents', 'SPHERE_sphereVents']) {
      const r = parseFormula(raw, { sphere: true });
      expect(r.ok && r.formula.terms[0], raw).toEqual({
        kind: 'sphere',
        sphere: 'sphereVents',
        mult: 1,
      });
    }
    const accented = parseFormula('SPHÈRE_OCÉANS', { sphere: true });
    expect(accented.ok && accented.formula.terms[0]).toMatchObject({ sphere: 'sphereOceans' });
  });

  it('rejects an unknown sphere', () => {
    const r = parseFormula('SPHERE_BANANE', { sphere: true });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/inconnue/i);
  });

  it('folds a sphere the resolver answers for, keeps the others symbolic', () => {
    const parsed = parseFormula('SPHERE + SPHERE_FEU', { sphere: true });
    if (!parsed.ok) throw new Error(parsed.error);
    // A caller that only knows the spell's OWN sphere answers for `null`.
    const { staticTotal, sphereTerms } = computeFormula(
      parsed.formula,
      caracValue({}),
      undefined,
      undefined,
      (key) => (key == null ? 4 : null),
    );
    expect(staticTotal).toBe(4);
    expect(sphereTerms).toEqual([{ sphere: 'sphereFeu', mult: 1 }]);
  });
});

describe('spellFormulaResult', () => {
  const ownSphere = (n: number) => (key: string | null) => (key == null ? n : null);

  it('returns null for an empty formula', () => {
    expect(spellFormulaResult('')).toBeNull();
    expect(spellFormulaResult(null)).toBeNull();
    expect(spellFormulaResult(undefined)).toBeNull();
  });

  it('renders symbolically before the roll', () => {
    expect(spellFormulaResult('1 + NR')).toBe('1 + NR');
    expect(spellFormulaResult('30 + 30 par NR')).toBe('30 + 30 × NR');
  });

  it('resolves to a number once NR is known', () => {
    expect(spellFormulaResult('1 + NR', { nr: 3 })).toBe('4');
    expect(spellFormulaResult('30 + 30 par NR', { nr: 2 })).toBe('90');
  });

  it('does not print a leading zero for a lone NR', () => {
    expect(spellFormulaResult('NR')).toBe('NR');
    expect(spellFormulaResult('2 par NR')).toBe('2 × NR');
  });

  it('still prints a lone zero', () => {
    expect(spellFormulaResult('0')).toBe('0');
  });

  it('falls back to raw text when the formula does not parse', () => {
    expect(spellFormulaResult('  autant que NR  ')).toBe('autant que NR');
  });

  it('renders SPHERE symbolically with no character in context', () => {
    expect(spellFormulaResult('SPHERE')).toBe('Sphère');
    expect(spellFormulaResult('SPHERE x2')).toBe('Sphère × 2');
    expect(spellFormulaResult('SPHERE_VENTS')).toBe('Sphère Vents');
  });

  it('resolves SPHERE against the character', () => {
    expect(spellFormulaResult('SPHERE', { sphere: ownSphere(6) })).toBe('6');
    expect(spellFormulaResult('SPHERE x2', { sphere: ownSphere(6) })).toBe('12');
  });

  it('resolves the two variables independently', () => {
    // Sphere known, NR not yet rolled — the durée still has to read.
    expect(spellFormulaResult('SPHERE + 3 par NR', { sphere: ownSphere(5) })).toBe('5 + 3 × NR');
    expect(spellFormulaResult('SPHERE + 3 par NR', { nr: 2, sphere: ownSphere(5) })).toBe('11');
  });
});
