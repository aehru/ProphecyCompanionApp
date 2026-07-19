import { describe, expect, it } from 'vitest';

import { CampaignSocket, type WebSocketLike } from './campaign-client';
import { playerHello, type ServerMessage } from './campaign-protocol';

class FakeWS implements WebSocketLike {
  sent: string[] = [];
  closedByClient = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closedByClient = true;
  }
}

// `heartbeatMs: 0` by default so the reconnect/backoff assertions below see only
// the reconnect timers; the heartbeat has its own test that opts back in.
function harness(heartbeatMs = 0) {
  const sockets: FakeWS[] = [];
  const scheduled: { fn: () => void; ms: number }[] = [];
  const messages: ServerMessage[] = [];
  const statuses: string[] = [];
  const urls: string[] = [];
  const client = new CampaignSocket({
    serverUrl: 'https://play.example.org',
    hello: playerHello('ABCD2345', 'char-1'),
    onMessage: (m) => messages.push(m),
    onStatus: (s) => statuses.push(s),
    heartbeatMs,
    makeSocket: (url) => {
      urls.push(url);
      const ws = new FakeWS();
      sockets.push(ws);
      return ws;
    },
    schedule: (fn, ms) => scheduled.push({ fn, ms }),
  });
  return { client, sockets, scheduled, messages, statuses, urls };
}

describe('CampaignSocket', () => {
  it('connects to <server>/ws and sends the hello on open', () => {
    const h = harness();
    h.client.connect();
    expect(h.urls).toEqual(['wss://play.example.org/ws']);
    h.sockets[0].onopen?.();
    expect(JSON.parse(h.sockets[0].sent[0])).toEqual({
      v: 1,
      type: 'hello',
      role: 'player',
      code: 'ABCD2345',
      charId: 'char-1',
    });
    expect(h.statuses).toEqual(['connecting', 'online']);
  });

  it('parses incoming frames and forwards them', () => {
    const h = harness();
    h.client.connect();
    h.sockets[0].onopen?.();
    h.sockets[0].onmessage?.({ data: JSON.stringify({ v: 1, type: 'pong' }) });
    h.sockets[0].onmessage?.({ data: 'garbage' });
    expect(h.messages.map((m) => m.type)).toEqual(['pong', 'unknown']);
  });

  it('reconnects with doubling capped backoff', () => {
    const h = harness();
    h.client.connect();
    h.sockets[0].onclose?.(); // never opened — drop
    expect(h.scheduled.map((s) => s.ms)).toEqual([1000]);
    h.scheduled[0].fn(); // reconnect #1
    h.sockets[1].onclose?.();
    expect(h.scheduled.map((s) => s.ms)).toEqual([1000, 2000]);
    h.scheduled[1].fn();
    h.sockets[2].onopen?.(); // healthy — backoff resets
    h.sockets[2].onclose?.();
    expect(h.scheduled.map((s) => s.ms)).toEqual([1000, 2000, 1000]);
  });

  it('close() stops reconnecting for good', () => {
    const h = harness();
    h.client.connect();
    h.sockets[0].onopen?.();
    h.client.close();
    expect(h.sockets[0].closedByClient).toBe(true);
    h.sockets[0].onclose?.();
    expect(h.scheduled).toEqual([]); // no reconnect scheduled
    h.client.connect(); // and connect() after close is a no-op
    expect(h.sockets).toHaveLength(1);
  });

  it('pings on an interval while connected, and stops once the socket drops', () => {
    const h = harness(30_000);
    h.client.connect();
    h.sockets[0].onopen?.();
    // Hello only so far; the first ping is scheduled, not sent.
    expect(h.sockets[0].sent).toHaveLength(1);
    expect(h.scheduled.map((s) => s.ms)).toEqual([30_000]);

    h.scheduled[0].fn(); // tick #1
    expect(JSON.parse(h.sockets[0].sent[1])).toEqual({ v: 1, type: 'ping' });
    h.scheduled[1].fn(); // tick #2 — the loop keeps re-arming itself
    expect(JSON.parse(h.sockets[0].sent[2])).toEqual({ v: 1, type: 'ping' });
    expect(h.scheduled.map((s) => s.ms)).toEqual([30_000, 30_000, 30_000]);

    // Connection drops: the pending tick must not ping a stale socket.
    h.sockets[0].onclose?.();
    const before = h.sockets[0].sent.length;
    h.scheduled[2].fn();
    expect(h.sockets[0].sent).toHaveLength(before);
  });

  it('stops pinging after close()', () => {
    const h = harness(30_000);
    h.client.connect();
    h.sockets[0].onopen?.();
    h.client.close();
    const before = h.sockets[0].sent.length;
    h.scheduled[0].fn();
    expect(h.sockets[0].sent).toHaveLength(before);
  });

  it('send() while offline is a silent drop, not a crash', () => {
    const h = harness();
    expect(() => h.client.send({ v: 1, type: 'ping' })).not.toThrow();
  });
});
