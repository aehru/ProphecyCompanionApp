import { describe, expect, it } from 'vitest';

import {
  gmHello,
  httpUrl,
  joinLink,
  normalizeJoinCode,
  normalizeServerHost,
  parseJoinLink,
  parseServerMessage,
  playerHello,
  shareMsg,
  unshareMsg,
  wsUrl,
} from './campaign-protocol';
import type { SharedCharacter } from './character-share';

describe('outgoing messages', () => {
  it('builds the two hello variants the server expects (v2: no charId)', () => {
    expect(gmHello('ABCD2345', 'tok')).toEqual({
      v: 2,
      type: 'hello',
      role: 'gm',
      code: 'ABCD2345',
      gmToken: 'tok',
    });
    // v2: the hello identifies the session — characters arrive via share.
    expect(playerHello('ABCD2345')).toEqual({
      v: 2,
      type: 'hello',
      role: 'player',
      code: 'ABCD2345',
    });
  });

  it('builds share/unshare keyed by charId', () => {
    const character = { nom: 'Kael' } as unknown as SharedCharacter;
    expect(shareMsg('c1', character)).toMatchObject({ type: 'share', charId: 'c1', character });
    expect(unshareMsg('c1')).toEqual({ v: 2, type: 'unshare', charId: 'c1' });
  });
});

describe('parseServerMessage', () => {
  it('parses every server message type', () => {
    const frames = [
      { v: 2, type: 'welcome', campaign: { code: 'C', name: 'N' }, role: 'gm' },
      { v: 2, type: 'roster', characters: [] },
      { v: 2, type: 'update', charId: 'c1', character: { nom: 'K' }, updatedAt: 12, owner: 'gm' },
      { v: 2, type: 'remove', charId: 'c1' },
      { v: 2, type: 'presence', charId: 'c1', online: true },
      { v: 2, type: 'pong' },
      { v: 2, type: 'error', code: 'forbidden', message: 'nope' },
    ];
    for (const f of frames) {
      expect(parseServerMessage(JSON.stringify(f)).type).toBe(f.type);
    }
  });

  it('parses owner on roster entries and updates, defaulting to player', () => {
    const roster = parseServerMessage(
      JSON.stringify({
        v: 2,
        type: 'roster',
        characters: [
          { charId: 'c1', character: { nom: 'K' }, online: true, updatedAt: 1, owner: 'gm' },
          // Missing / garbage owner tolerated (defaults to player).
          { charId: 'c2', character: { nom: 'L' }, online: false, updatedAt: 2 },
          { charId: 'c3', character: { nom: 'M' }, online: false, updatedAt: 3, owner: 'alien' },
        ],
      }),
    );
    expect(roster.type === 'roster' && roster.characters.map((c) => c.owner)).toEqual([
      'gm',
      'player',
      'player',
    ]);

    const update = parseServerMessage(
      JSON.stringify({ v: 2, type: 'update', charId: 'c1', character: {}, updatedAt: 1 }),
    );
    expect(update.type === 'update' && update.owner).toBe('player');
  });

  it('passes unknown character fields through (tolerant reader)', () => {
    const msg = parseServerMessage(
      JSON.stringify({
        v: 2,
        type: 'update',
        charId: 'c1',
        character: { nom: 'K', futureField: { deep: true } },
        updatedAt: 1,
        owner: 'player',
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

describe('joinLink', () => {
  it('builds the deep link with a normalized server host', () => {
    expect(joinLink('ABCD2345', 'https://play.example.org/')).toBe(
      'prophecyapp://campaigns?code=ABCD2345&server=play.example.org',
    );
    expect(joinLink('ABCD2345', '192.168.1.10:8000')).toBe(
      'prophecyapp://campaigns?code=ABCD2345&server=192.168.1.10%3A8000',
    );
  });
});

describe('parseJoinLink', () => {
  it('round-trips what joinLink emits', () => {
    expect(parseJoinLink(joinLink('ABCD2345', '192.168.1.10:8000'))).toEqual({
      code: 'ABCD2345',
      server: '192.168.1.10:8000',
    });
    expect(parseJoinLink(joinLink('ABCD2345', 'https://play.example.org/'))).toEqual({
      code: 'ABCD2345',
      server: 'play.example.org',
    });
  });

  it('accepts foreign schemes/paths as long as code+server params exist', () => {
    expect(parseJoinLink('https://relay.example.org/join?code=abcd2345&server=relay.example.org')).toEqual(
      { code: 'ABCD2345', server: 'relay.example.org' },
    );
  });

  it('normalizes the scanned code and server like hand-typed input', () => {
    expect(parseJoinLink('prophecyapp://campaigns?code=il0o&server=https%3A%2F%2Fapp.fr%2F')).toEqual(
      { code: '1100', server: 'app.fr' },
    );
  });

  it('returns null on foreign QR content', () => {
    expect(parseJoinLink('https://example.org/menu.pdf')).toBeNull();
    expect(parseJoinLink('WIFI:S:mynet;T:WPA;P:secret;;')).toBeNull();
    expect(parseJoinLink('prophecyapp://campaigns?code=ABCD2345')).toBeNull();
    expect(parseJoinLink('prophecyapp://campaigns?code=%E0%A4%A&server=x')).toBeNull();
    expect(parseJoinLink('')).toBeNull();
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
