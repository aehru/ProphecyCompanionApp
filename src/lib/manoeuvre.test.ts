import { describe, expect, it } from 'vitest';

import { MANOEUVRE_CATALOG } from '@/data/manoeuvre-catalog';
import type { CustomManoeuvre } from '@/db/schema';

import {
  customManoeuvrePreset,
  parseRating,
  ratingCell,
  ratingLabel,
  ratingShort,
  ratingWarning,
  variantOf,
} from './manoeuvre';

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

describe('ratingCell', () => {
  it('writes back every catalogue cell as one parseRating reads the same', () => {
    for (const m of MANOEUVRE_CATALOG) {
      if (!m.stats) continue;
      for (const r of [m.stats.difficulty, m.stats.dodge, m.stats.parry]) {
        expect(parseRating(ratingCell(r)), `${m.id} « ${ratingCell(r)} »`).toEqual(r);
      }
    }
  });
});

const row = (patch: Partial<CustomManoeuvre>): CustomManoeuvre => ({
  id: 'u-1',
  context: 'melee',
  family: 'manoeuvre',
  name: 'Coup de tête',
  difficulty: '',
  dodge: '',
  parry: '',
  damage: '',
  roll: '',
  inGameEffect: '',
  description: 'Un coup bas.',
  presetId: null,
  createdAt: new Date(0),
  ...patch,
});

describe('« Maison » manœuvres', () => {
  it('has no stat block until one cell is filled', () => {
    expect(customManoeuvrePreset(row({})).stats).toBeUndefined();
    const p = customManoeuvrePreset(row({ difficulty: '20' }));
    expect(p.stats?.difficulty).toEqual({ value: 20 });
    expect(ratingLabel(p.stats!.dodge)).toBe('—');
    expect(p.custom).toBe(true);
  });

  it('keeps a cell the grammar refuses, printed as typed', () => {
    const p = customManoeuvrePreset(row({ dodge: 'très dure' }));
    expect(ratingLabel(p.stats!.dodge)).toBe('très dure');
    expect(ratingWarning('très dure')).toMatch(/inconnu/);
    expect(ratingWarning('normale')).toBeNull();
    expect(ratingWarning('  ')).toBeNull();
  });

  it('starts a variant from the rulebook entry it names', () => {
    const feinter = MANOEUVRE_CATALOG.find((m) => m.id === 'melee-feinter')!;
    const v = variantOf(feinter);
    expect(v.presetId).toBe('melee-feinter');
    const back = customManoeuvrePreset(row({ ...v, presetId: v.presetId ?? null }));
    expect(back.stats).toEqual(feinter.stats);
    expect(back.description).toBe(feinter.description);
  });
});
