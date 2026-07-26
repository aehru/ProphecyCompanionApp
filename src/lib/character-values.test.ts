import { describe, expect, it } from 'vitest';

import { formatDecimal, parseDecimal, sanitizeNumericInput } from '@/lib/character-values';

// Fractional values exist for one field only — a weapon's creation time, which
// the rulebook gives as half a day for the simplest weapons. The UI is French,
// so the separator shown and accepted is a comma.

describe('formatDecimal', () => {
  it('renders a fraction with the French comma', () => {
    expect(formatDecimal(0.5)).toBe('0,5');
    expect(formatDecimal(1.25)).toBe('1,25');
  });

  it('leaves whole numbers alone', () => {
    expect(formatDecimal(4)).toBe('4');
    expect(formatDecimal(0)).toBe('0');
  });

  it('renders nothing for a missing value', () => {
    expect(formatDecimal(null)).toBe('');
    expect(formatDecimal(undefined)).toBe('');
  });
});

describe('parseDecimal', () => {
  it('accepts either separator', () => {
    expect(parseDecimal('0,5')).toBe(0.5);
    expect(parseDecimal('0.5')).toBe(0.5);
  });

  it('accepts a bare separator as the user types', () => {
    expect(parseDecimal('0,')).toBe(0);
    expect(parseDecimal(',5')).toBe(0.5);
  });

  it('never returns NaN', () => {
    expect(parseDecimal('')).toBe(0);
    expect(parseDecimal('abc')).toBe(0);
  });
});

describe('sanitizeNumericInput', () => {
  it('keeps digits only by default', () => {
    expect(sanitizeNumericInput('12a-3.4')).toBe('1234');
  });

  it('keeps a single leading minus when signed', () => {
    expect(sanitizeNumericInput('-3', { signed: true })).toBe('-3');
    expect(sanitizeNumericInput('3-4-', { signed: true })).toBe('34');
  });

  it('keeps one separator when decimal, normalized to a comma', () => {
    expect(sanitizeNumericInput('0.5', { decimal: true })).toBe('0,5');
    expect(sanitizeNumericInput('0,5,5', { decimal: true })).toBe('0,55');
  });

  it('preserves a trailing separator (mid-typing)', () => {
    expect(sanitizeNumericInput('0,', { decimal: true })).toBe('0,');
  });
});
