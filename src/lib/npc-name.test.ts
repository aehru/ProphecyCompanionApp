import { describe, expect, it } from 'vitest';

import { nextNpcName, npcStem } from './npc-name';

describe('npcStem', () => {
  it('strips a trailing number', () => {
    expect(npcStem('Garde 3')).toBe('Garde');
  });

  it('leaves an unnumbered name alone', () => {
    expect(npcStem('Garde')).toBe('Garde');
  });

  it('keeps interior digits', () => {
    expect(npcStem('Garde d2 royale')).toBe('Garde d2 royale');
  });
});

describe('nextNpcName', () => {
  it('numbers the first copy 2, not 1', () => {
    expect(nextNpcName('Garde', ['Garde'])).toBe('Garde 2');
  });

  it('counts the source even when the caller omits it', () => {
    expect(nextNpcName('Garde', [])).toBe('Garde 2');
  });

  it('continues the series from the highest taken', () => {
    expect(nextNpcName('Garde', ['Garde', 'Garde 2', 'Garde 3'])).toBe('Garde 4');
  });

  it('duplicating a numbered member extends the same series', () => {
    expect(nextNpcName('Garde 2', ['Garde', 'Garde 2'])).toBe('Garde 3');
  });

  it('does not reuse gaps', () => {
    expect(nextNpcName('Garde', ['Garde', 'Garde 4'])).toBe('Garde 5');
  });

  it('ignores other series and unrelated names', () => {
    expect(nextNpcName('Garde', ['Garde', 'Archer 7', 'Gardien 3', 'Marchand'])).toBe('Garde 2');
  });

  it('treats a longer stem as its own series', () => {
    expect(nextNpcName('Garde royale', ['Garde 5', 'Garde royale'])).toBe('Garde royale 2');
  });

  it('falls back for a blank name', () => {
    expect(nextNpcName('   ', [])).toBe('PNJ 1');
  });
});
