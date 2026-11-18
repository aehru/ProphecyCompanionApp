import { expect, it } from 'vitest';

import { plural } from './plural';

it('agrees on the count, negative included', () => {
  expect(plural(1, 'point')).toBe('point');
  expect(plural(0, 'point')).toBe('point');
  expect(plural(3, 'point')).toBe('points');
  expect(plural(-2, 'point')).toBe('points');
  expect(plural(2, 'a', 'ont')).toBe('ont');
});
