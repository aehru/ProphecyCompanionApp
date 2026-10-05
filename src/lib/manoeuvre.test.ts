import { describe, expect, it } from 'vitest';

import { parseRating, ratingLabel, ratingShort } from './manoeuvre';

describe('parseRating', () => {
  it('reads a graded word, with or without its implied value', () => {
    expect(parseRating('normale (15)')).toEqual({ key: 'normale', value: 15 });
    expect(parseRating('Normale')).toEqual({ key: 'normale', value: 15 });
    expect(parseRating('évidente')).toEqual({ key: 'evidente', value: 5 });
  });

  it('refuses a value that contradicts the word', () => {
    expect(parseRating('normale (20)')).toMatch(/vaut 15/);
    expect(parseRating('impossible (10)')).toMatch(/ne prend pas de nombre/);
  });

  it('reads bare numbers and the + X of Attaque précise', () => {
    expect(parseRating('20')).toEqual({ value: 20 });
    expect(parseRating('15 + X')).toEqual({ value: 15, plusX: true });
  });

  it('keeps what qualifies the word as a note', () => {
    expect(parseRating("selon l'arme")).toEqual({ key: 'selon', note: "l'arme" });
    expect(parseRating('opposition si possible')).toEqual({ key: 'opposition', note: 'si possible' });
    expect(parseRating('normale (inutile)')).toEqual({ key: 'normale', value: 15, note: 'inutile' });
  });

  it('matches multi-word keys and the feminine spelling', () => {
    expect(parseRating('non applicable')).toEqual({ key: 'non-applicable' });
    expect(parseRating('spéciale')).toEqual({ key: 'special' });
  });

  it('rejects the unknown, the empty and a bare « selon »', () => {
    expect(typeof parseRating('moyenne')).toBe('string');
    expect(typeof parseRating('')).toBe('string');
    expect(typeof parseRating('selon')).toBe('string');
  });
});

describe('ratingLabel / ratingShort', () => {
  it('prints the full and the compact reading', () => {
    const r = parseRating('normale (inutile)');
    if (typeof r === 'string') throw new Error(r);
    expect(ratingLabel(r)).toBe('Normale (15), inutile');
    expect(ratingShort(r)).toBe('15');
    expect(ratingLabel({ value: 15, plusX: true })).toBe('15 + X');
    expect(ratingShort({ value: 15, plusX: true })).toBe('15+X');
    expect(ratingLabel({ key: 'selon', note: "l'arme" })).toBe("Selon l'arme");
    expect(ratingShort({ key: 'impossible' })).toBe('Impossible');
  });
});
