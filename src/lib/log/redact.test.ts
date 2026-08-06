import { describe, expect, it } from 'vitest';

import {
  ALLOWED_PAYLOAD_KEYS,
  isKeyAllowed,
  MAX_STACK,
  MAX_STRING,
  redactError,
  redactPayload,
  SECRET_KEYS,
  truncate,
  USER_TEXT_KEYS,
} from './redact';

describe('the allow-list itself', () => {
  // The load-bearing test: the diagnostic log's whole privacy claim is "a key a
  // user typed into cannot be written". A future contributor adding `nom` to
  // ALLOWED_PAYLOAD_KEYS to debug something must fail here, not ship it.
  it('never allow-lists a user-text key', () => {
    const overlap = ALLOWED_PAYLOAD_KEYS.filter((k) => USER_TEXT_KEYS.includes(k));
    expect(overlap).toEqual([]);
    for (const key of USER_TEXT_KEYS) expect(isKeyAllowed(key)).toBe(false);
  });

  it('never allow-lists a credential or a server address', () => {
    const overlap = ALLOWED_PAYLOAD_KEYS.filter((k) => SECRET_KEYS.includes(k));
    expect(overlap).toEqual([]);
    for (const key of SECRET_KEYS) expect(isKeyAllowed(key)).toBe(false);
  });

  it('denies a user-text key whatever its casing', () => {
    expect(isKeyAllowed('Nom')).toBe(false);
    expect(isKeyAllowed('NOTES')).toBe(false);
    expect(isKeyAllowed('gmTOKEN')).toBe(false);
  });

  it('drops anything simply unknown', () => {
    expect(isKeyAllowed('whateverNewField')).toBe(false);
  });
});

describe('redactPayload', () => {
  it('keeps allow-listed keys and counts the rest', () => {
    const out = redactPayload({
      characterId: 12,
      entity: 'characters',
      nom: 'Aldric le Bref',
      biographie: 'né à…',
      somethingNew: 1,
    });
    expect(out).toEqual({ characterId: 12, entity: 'characters', _dropped: 3 });
  });

  it('cannot be talked into writing user text, even under an allowed key name', () => {
    // `fields` is allow-listed, but the VALUES are column names by contract.
    // What matters is that the denied keys never appear whatever the shape.
    const out = redactPayload({ fields: ['nom', 'notes'], nom: 'Aldric' });
    expect(out).toEqual({ fields: ['nom', 'notes'], _dropped: 1 });
    expect(JSON.stringify(out)).not.toContain('Aldric');
  });

  it('returns undefined when nothing survives and nothing was dropped', () => {
    expect(redactPayload(undefined)).toBeUndefined();
    expect(redactPayload({})).toBeUndefined();
  });

  it('still reports a count when everything was dropped', () => {
    expect(redactPayload({ nom: 'x', notes: 'y' })).toEqual({ _dropped: 2 });
  });

  it('truncates long strings', () => {
    const long = 'a'.repeat(MAX_STRING + 50);
    const out = redactPayload({ reason: long }) as { reason: string };
    expect(out.reason.startsWith('a'.repeat(MAX_STRING))).toBe(true);
    expect(out.reason).toContain('(+50)');
  });

  it('walks nested objects with the same list', () => {
    const out = redactPayload({ from: { route: '/character/3', nom: 'Aldric' } });
    expect(out).toEqual({ from: { route: '/character/3', _dropped: 1 } });
  });

  it('stops descending past the depth cap', () => {
    const deep = { to: { to: { to: { to: { route: '/x' } } } } };
    expect(JSON.stringify(redactPayload(deep))).not.toContain('/x');
  });

  it('caps array length and marks the overflow', () => {
    const out = redactPayload({ ids: Array.from({ length: 25 }, (_, i) => i) }) as {
      ids: unknown[];
    };
    expect(out.ids).toHaveLength(21);
    expect(out.ids[20]).toBe('…(+5)');
  });

  it('drops values it cannot serialize safely', () => {
    const out = redactPayload({ count: () => 1, index: Symbol('s'), length: NaN, ok: false });
    expect(out).toEqual({ ok: false, _dropped: 3 });
  });

  it('survives a payload that throws while being walked', () => {
    const hostile = {} as Record<string, unknown>;
    Object.defineProperty(hostile, 'count', {
      enumerable: true,
      get() {
        throw new Error('boom');
      },
    });
    expect(redactPayload(hostile)).toEqual({ _dropped: 1 });
  });
});

describe('redactError', () => {
  it('keeps name/message/stack, truncated', () => {
    const e = new Error('x'.repeat(MAX_STRING + 10));
    e.stack = 'y'.repeat(MAX_STACK + 10);
    const out = redactError(e);
    expect(out.name).toBe('Error');
    expect(out.message).toContain('(+10)');
    expect(out.stack).toContain('(+10)');
  });

  it('normalizes a non-Error throw', () => {
    expect(redactError('nope')).toEqual({ name: 'NonError', message: 'nope' });
    expect(redactError({ a: 1 }).message).toBe('{"a":1}');
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('abc')).toBe('abc');
  });
});
