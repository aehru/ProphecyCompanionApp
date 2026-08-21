import { describe, expect, it } from 'vitest';

import {
  generateGivenName,
  generateNpcName,
  nextTemplateIndex,
  templatedName,
  uniqueNpcName,
} from '@/lib/npc-names';
import { seededRng } from '@/lib/rng';

describe('generateGivenName', () => {
  it('replays for the same seed', () => {
    expect(generateGivenName(seededRng('a'))).toBe(generateGivenName(seededRng('a')));
  });

  it('is a capitalized, letters-only word', () => {
    const rng = seededRng('names');
    for (let i = 0; i < 200; i++) {
      const name = generateGivenName(rng);
      expect(name).toMatch(/^[A-Z][a-z]+$/);
      expect(name.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('varies across draws', () => {
    const rng = seededRng('variety');
    const seen = new Set(Array.from({ length: 50 }, () => generateGivenName(rng)));
    expect(seen.size).toBeGreaterThan(40);
  });
});

describe('generateNpcName', () => {
  it('adds an origin or a sobriquet, never both', () => {
    const rng = seededRng('full');
    for (let i = 0; i < 300; i++) {
      const name = generateNpcName(rng);
      const hasOrigin = name.includes(' de ');
      const hasEpithet = / (le|la|l')/.test(name);
      expect(hasOrigin && hasEpithet).toBe(false);
    }
  });
});

describe('uniqueNpcName', () => {
  it('avoids a name already at the table', () => {
    const taken: string[] = [];
    const rng = seededRng('roster');
    for (let i = 0; i < 20; i++) taken.push(uniqueNpcName(rng, taken));
    expect(new Set(taken.map((n) => n.toLowerCase())).size).toBe(20);
  });

  it('falls back to numbering when nothing else is free', () => {
    // Every draw is the same name: the RNG is frozen, so the pools give one
    // result and the numbering path is the only way out.
    const frozen = () => 0;
    const first = uniqueNpcName(frozen, []);
    expect(uniqueNpcName(frozen, [first])).toBe(`${first} 2`);
  });
});

describe('templatedName / nextTemplateIndex', () => {
  it('numbers a template', () => {
    expect(templatedName('Garde', 2)).toBe('Garde #2');
    expect(templatedName('  Garde  ', 1)).toBe('Garde #1');
  });

  it('starts at one on an empty table', () => {
    expect(nextTemplateIndex('Garde', [])).toBe(1);
  });

  it('continues the series already at the table', () => {
    expect(nextTemplateIndex('Garde', ['Garde #1', 'Garde #2'])).toBe(3);
  });

  it('counts a bare template as the first of its series', () => {
    expect(nextTemplateIndex('Garde', ['Garde'])).toBe(2);
  });

  it('does not reuse a gap', () => {
    expect(nextTemplateIndex('Garde', ['Garde #1', 'Garde #4'])).toBe(5);
  });

  it('ignores other series and other names', () => {
    expect(nextTemplateIndex('Garde', ['Brigand #7', 'Kaelen', 'Gardeur #3'])).toBe(1);
  });
});
