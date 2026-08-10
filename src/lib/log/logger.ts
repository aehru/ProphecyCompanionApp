// The logger engine: ring buffer in, redacted NDJSON out.
//
// Pure in the sense that matters — it imports no framework and takes its sink,
// clock and session id by injection, so the whole write/flush/rotate policy is
// exercised by the plain-Node test runner. The app-wide singleton (platform
// sink, persisted level, global handlers) is assembled in `index.ts`.
//
// Policy, all of it here:
//  - an entry is kept only if its level ranks at or above the active level;
//  - every payload goes through the allow-list redactor, no exceptions;
//  - flush REWRITES `current` wholesale from the buffer — never appends — so the
//    file can't outgrow the buffer's own caps and a torn write costs one flush;
//  - flushes are debounced (2s) to keep high-frequency UI writes cheap, but an
//    `error` flushes immediately: the interesting crash is the one that took the
//    process down before the timer fired.

import { RingBuffer, MAX_BYTES, MAX_ENTRIES } from './ring-buffer';
import { redactError, redactPayload } from './redact';
import { entrySize, serializeEntries } from './serialize';
import {
  LEVEL_RANK,
  type LogEntry,
  type LogLevel,
  type LogPayload,
  type LogSink,
} from './types';

/** Debounce before a normal flush reaches the sink. */
export const FLUSH_DEBOUNCE_MS = 2000;

export interface LoggerOptions {
  sink?: LogSink | null;
  level?: LogLevel;
  sessionId?: string;
  maxEntries?: number;
  maxBytes?: number;
  debounceMs?: number;
  now?: () => number;
}

type Listener = () => void;

export class Logger {
  private buffer: RingBuffer<LogEntry>;
  private level: LogLevel;
  private sink: LogSink | null;
  private readonly sessionId: string;
  private readonly debounceMs: number;
  private readonly now: () => number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();
  /** Serialized in-flight flush, so two flushes can't interleave on one file. */
  private writing: Promise<void> = Promise.resolve();
  /** True once entries changed since the last successful write. */
  private dirty = false;

  constructor(opts: LoggerOptions = {}) {
    this.buffer = new RingBuffer<LogEntry>(
      opts.maxEntries ?? MAX_ENTRIES,
      opts.maxBytes ?? MAX_BYTES,
      entrySize,
    );
    this.level = opts.level ?? 'info';
    this.sink = opts.sink ?? null;
    this.sessionId = opts.sessionId ?? 'nosession';
    this.debounceMs = opts.debounceMs ?? FLUSH_DEBOUNCE_MS;
    this.now = opts.now ?? (() => Date.now());
  }

  // ---------------------------------------------------------------- config

  getLevel(): LogLevel {
    return this.level;
  }

  setLevel(level: LogLevel): void {
    if (level === this.level) return;
    this.level = level;
    this.notify();
  }

  /**
   * Attach the persistence backend. Until this is called the logger keeps
   * everything in memory — which is exactly how `index.ts` avoids racing the
   * launch rotation: a flush that fired first would overwrite `current` before
   * the previous launch's copy had been moved to `previous`. Anything buffered
   * meanwhile is written by the flush scheduled here.
   */
  setSink(sink: LogSink | null): void {
    this.sink = sink;
    if (sink && this.dirty) this.schedule();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // ----------------------------------------------------------------- write

  debug(msg: string, data?: LogPayload): void {
    this.write('debug', msg, data);
  }

  info(msg: string, data?: LogPayload): void {
    this.write('info', msg, data);
  }

  warn(msg: string, data?: LogPayload): void {
    this.write('warn', msg, data);
  }

  /** `error` also forces an immediate flush — the crash may be next. */
  error(msg: string, err?: unknown, data?: LogPayload): void {
    this.write('error', msg, data, err);
  }

  private write(lvl: LogLevel, msg: string, data?: LogPayload, err?: unknown): void {
    if (LEVEL_RANK[lvl] < LEVEL_RANK[this.level]) return;
    let entry: LogEntry;
    try {
      entry = {
        t: this.now(),
        lvl,
        sid: this.sessionId,
        msg,
        data: redactPayload(data),
        err: err === undefined ? undefined : redactError(err),
      };
    } catch {
      // Logging must never be the thing that breaks the app.
      return;
    }
    this.buffer.push(entry);
    this.dirty = true;
    this.notify();
    if (lvl === 'error') {
      void this.flush();
    } else {
      this.schedule();
    }
  }

  // ----------------------------------------------------------------- flush

  private schedule(): void {
    if (this.timer != null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
  }

  /**
   * Rewrite `current` from the buffer. Resolves when the write settled; never
   * rejects — a full disk must not surface as an unhandled rejection.
   */
  flush(): Promise<void> {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const sink = this.sink;
    if (!sink || !this.dirty) return this.writing;
    const text = serializeEntries(this.buffer.toArray());
    this.dirty = false;
    this.writing = this.writing
      .catch(() => {})
      .then(() => sink.write('current', text))
      .catch(() => {
        // Keep the entries in memory; the next flush retries the whole file.
        this.dirty = true;
      });
    return this.writing;
  }

  // ------------------------------------------------------------------ read

  /** Snapshot of the in-memory entries, oldest first. */
  entries(): LogEntry[] {
    return this.buffer.toArray();
  }

  get size(): { entries: number; bytes: number } {
    return { entries: this.buffer.length, bytes: this.buffer.bytes };
  }

  /** Wipe memory AND both files. Used by the Diagnostic screen's "Effacer". */
  async clear(): Promise<void> {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.buffer.clear();
    this.dirty = false;
    this.notify();
    const sink = this.sink;
    if (!sink) return;
    try {
      await sink.remove('current');
      await sink.remove('previous');
    } catch {
      // best-effort — the buffer is already empty
    }
  }

  // ------------------------------------------------------------- subscribe

  /** Live tail. Returns the unsubscribe function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {
        // a broken listener must not break logging
      }
    }
  }
}
