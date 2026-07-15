import { describe, expect, it } from 'vitest';

import { newUuid } from './uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newUuid', () => {
  it('produces a well-formed RFC-4122 v4 UUID', () => {
    expect(newUuid()).toMatch(V4);
  });

  it('sets the version (4) and variant (8/9/a/b) nibbles', () => {
    for (let i = 0; i < 50; i++) {
      const u = newUuid();
      expect(u[14]).toBe('4');
      expect('89ab').toContain(u[19]);
    }
  });

  it('does not collide across many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) seen.add(newUuid());
    expect(seen.size).toBe(10_000);
  });
});
