// A small campaign WebSocket wrapper: sends the hello on open, parses incoming
// frames (tolerantly — see campaign-protocol), and reconnects with capped
// exponential backoff until `close()` is called. The socket implementation is
// injectable so the whole lifecycle is unit-testable in plain Node; in the app
// the global React Native `WebSocket` (browser-compatible API) is used.

import {
  type HelloMsg,
  parseServerMessage,
  type ServerMessage,
  wsUrl,
} from '@/lib/campaign-protocol';

/** The subset of the browser/RN WebSocket API we rely on. */
export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
}

export type SocketStatus = 'connecting' | 'online' | 'offline';

export interface CampaignSocketOptions {
  serverUrl: string;
  hello: HelloMsg;
  onMessage: (msg: ServerMessage) => void;
  onStatus?: (status: SocketStatus) => void;
  /** Injectable for tests; defaults to the global WebSocket. */
  makeSocket?: (url: string) => WebSocketLike;
  /** Injectable for tests; defaults to setTimeout. */
  schedule?: (fn: () => void, ms: number) => unknown;
}

const BACKOFF_START_MS = 1000;
const BACKOFF_MAX_MS = 15_000;

export class CampaignSocket {
  private readonly opts: CampaignSocketOptions;
  private ws: WebSocketLike | null = null;
  private closed = false;
  private backoffMs = BACKOFF_START_MS;

  constructor(opts: CampaignSocketOptions) {
    this.opts = opts;
  }

  connect(): void {
    if (this.closed) return;
    this.setStatus('connecting');
    const make =
      this.opts.makeSocket ??
      ((url: string) => new WebSocket(url) as unknown as WebSocketLike);
    const ws = make(wsUrl(this.opts.serverUrl));
    this.ws = ws;

    ws.onopen = () => {
      this.backoffMs = BACKOFF_START_MS; // healthy again — reset the backoff
      ws.send(JSON.stringify(this.opts.hello));
      this.setStatus('online');
    };
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') this.opts.onMessage(parseServerMessage(event.data));
    };
    // onerror is always followed by onclose — reconnect is handled there.
    ws.onerror = () => {};
    ws.onclose = () => {
      this.ws = null;
      if (this.closed) return;
      this.setStatus('offline');
      const delay = this.backoffMs;
      this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
      (this.opts.schedule ?? setTimeout)(() => this.connect(), delay);
    };
  }

  /** Send one outgoing message; silently dropped while offline (callers re-send
   * their current state on the next 'online' status instead of queueing). */
  send(msg: object): void {
    try {
      this.ws?.send(JSON.stringify(msg));
    } catch {
      // Socket died between status and send — the reconnect loop handles it.
    }
  }

  /** Stop for good: no further reconnects. */
  close(): void {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
    this.setStatus('offline');
  }

  private setStatus(status: SocketStatus): void {
    this.opts.onStatus?.(status);
  }
}
