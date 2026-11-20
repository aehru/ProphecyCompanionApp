import { expect, it } from 'vitest';

import { EMPTY_BUILD } from './creation';
import { isBlankDraft, parseDraft } from './creation-draft';

it('reads a stored draft back, clamping the step and filling missing fields', () => {
  const raw = JSON.stringify({ v: { nom: 'Kael' }, build: { age: 'adulte' }, step: 99, savedAt: 5 });
  const d = parseDraft(raw)!;
  expect(d.v.nom).toBe('Kael');
  expect(d.build.age).toBe('adulte');
  expect(d.build.skills.tier).toBe('normal');
  expect(d.step).toBe(10);
  expect(d.savedAt).toBe(5);
});

it('refuses what it cannot read', () => {
  expect(parseDraft(null)).toBeNull();
  expect(parseDraft('{oops')).toBeNull();
  expect(parseDraft('{"v":null,"build":{}}')).toBeNull();
});

it('a fresh start is not a draft', () => {
  expect(isBlankDraft(EMPTY_BUILD, 0)).toBe(true);
  expect(isBlankDraft(EMPTY_BUILD, 1)).toBe(false);
});
