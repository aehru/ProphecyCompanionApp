import { describe, expect, it } from 'vitest';

import {
  gmHello,
  httpUrl,
  normalizeJoinCode,
  normalizeServerHost,
  parseServerMessage,
  playerHello,
  shareMsg,
  unshareMsg,
  wsUrl,
} from './campaign-protocol';
import type { SharedCharacter } from './character-share';

describe('outgoing messages', () => {
  it('builds the two hello variants the server expects', () => {
    expect(gmHello('ABCD2345', 'tok')).toEqual({
      v: 1,
      type: 'hello',
      role: 'gm',
      code: 'ABCD2345',
      gmToken: 'tok',
    });
    expect(playerHello('ABCD2345', 'char-1')).toEqual({
      v: 1,
      type: 'hello',
      role: 'player',
      code: 'ABCD2345',
      charId: 'char-1',
    });
  });

  it('builds share/unshare keyed by charId', () => {
    const character = { nom: 'Kael' } as unknown as SharedCharacter;
    expect(shareMsg('c1', character)).toMatchObject({ type: 'share', charId: 'c1', character });
    expect(unshareMsg('c1')).toEqual({ v: 1, type: 'unshare', charId: 'c1' });
  });
});

describe('parseServerMessage', () => {
  it('parses every server message type', () => {
    const frames = [
      { v: 1, type: 'welcome', campaign: { code: 'C', name: 'N' }, role: 'gm' },
      { v: 1, type: 'roster', characters: [] },
      { v: 1, type: 'update', charId: 'c1', character: { nom: 'K' }, updatedAt: 12 },
      { v: 1, type: 'remove', charId: 'c1' },
      { v: 1, type: 'presence', charId: 'c1', online: true },
      { v: 1, type: 'pong' },
      { v: 1, type: 'error', code: 'forbidden', message: 'nope' },
    ];
    for (const f of frames) {
      expect(parseServerMessage(JSON.stringify(f)).type).toBe(f.type);
    }
  });

  it('passes unknown character fields through (tolerant reader)', () => {
    const msg = parseServerMessage(
      JSON.stringify({
        v: 1,
        type: 'update',
        charId: 'c1',
        character: { nom: 'K', futureField: { deep: true } },
        updatedAt: 1,
      }),
    );
    expect(msg.type === 'update' && msg.character.futureField).toEqual({ deep: true });
  });

  it('never throws: bad JSON and unknown types become "unknown"', () => {
    expect(parseServerMessage('not json').type).toBe('unknown');
    expect(parseServerMessage('42').type).toBe('unknown');
    expect(parseServerMessage(JSON.stringify({ type: 'v2-fancy' })).type).toBe('unknown');
    expect(parseServerMessage(JSON.stringify({ type: 'update' })).type).toBe('unknown');
  });
});

describe('normalizeJoinCode', () => {
  it('uppercases, trims, and maps excluded Crockford chars', () => {
    expect(normalizeJoinCode('  abcd 2345 ')).toBe('ABCD2345');
    expect(normalizeJoinCode('Il0o')).toBe('1100');
  });
});

describe('url builders', () => {
  it('the user types a bare host — public domains get TLS', () => {
    expect(httpUrl('app.fr')).toBe('https://app.fr');
    expect(httpUrl('www.app.fr')).toBe('https://www.app.fr');
    expect(wsUrl('play.example.org')).toBe('wss://play.example.org/ws');
  });

  it('LAN hosts get plain http/ws (self-host at the table)', () => {
    expect(httpUrl('192.168.1.10:8000')).toBe('http://192.168.1.10:8000');
    expect(wsUrl('192.168.1.10:8000')).toBe('ws://192.168.1.10:8000/ws');
    expect(httpUrl('localhost:8000')).toBe('http://localhost:8000');
    expect(wsUrl('gamepi.local:8000')).toBe('ws://gamepi.local:8000/ws');
  });

  it('pasted schemes and trailing slashes are discarded — we pick the scheme', () => {
    expect(normalizeServerHost('  https://app.fr/ ')).toBe('app.fr');
    expect(wsUrl('https://play.example.org')).toBe('wss://play.example.org/ws');
    expect(httpUrl('wss://play.example.org/')).toBe('https://play.example.org');
    expect(httpUrl('http://192.168.1.10:8000')).toBe('http://192.168.1.10:8000');
    expect(wsUrl('http://192.168.1.10:8000/')).toBe('ws://192.168.1.10:8000/ws');
  });
});
