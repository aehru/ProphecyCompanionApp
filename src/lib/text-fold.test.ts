import { describe, expect, it } from 'vitest';

import { fold, foldQuery } from '@/lib/text-fold';

describe('fold', () => {
  it('lowercases and strips accents', () => {
    expect(fold('Épée')).toBe('epee');
    expect(fold('Équitation')).toBe('equitation');
    expect(fold('Fatalité')).toBe('fatalite');
  });

  it('leaves inner spacing and punctuation alone', () => {
    expect(fold("Armes d'hast")).toBe("armes d'hast");
  });

  it('is idempotent', () => {
    expect(fold(fold('Sphère des Vents'))).toBe(fold('Sphère des Vents'));
  });
});

describe('foldQuery', () => {
  it('also trims what the player typed', () => {
    expect(foldQuery('  Épée de Feu ')).toBe('epee de feu');
  });

  it('folds a whitespace-only query to nothing, so it counts as no filter', () => {
    expect(foldQuery('   ')).toBe('');
  });
});
