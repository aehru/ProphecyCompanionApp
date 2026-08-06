// Shared vocabulary for the diagnostic log. Pure types + level ordering — no
// framework imports, so the redaction/buffer/logger modules stay unit-testable
// in the project's plain-Node vitest runner.

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** Severity rank — an entry is written when its rank >= the active level's. */
export const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function isLogLevel(v: unknown): v is LogLevel {
  return typeof v === 'string' && (LOG_LEVELS as readonly string[]).includes(v);
}

/** French labels for the level switcher (code English, UI French). */
export const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'Détail',
  info: 'Normal',
  warn: 'Alertes',
  error: 'Erreurs',
};

/**
 * One line of the log. `msg` is ALWAYS a developer-authored constant (an event
 * name like `repo.write`), never interpolated user content — callers put the
 * variable part in `data`, which goes through the allow-list redactor.
 */
export interface LogEntry {
  /** Epoch milliseconds. */
  t: number;
  lvl: LogLevel;
  /** Session id — random per launch, never persisted (see `session.ts`). */
  sid: string;
  msg: string;
  /** Redacted payload. Carries `_dropped: n` when keys were removed. */
  data?: Record<string, unknown>;
  err?: LoggedError;
}

export interface LoggedError {
  name: string;
  message: string;
  stack?: string;
}

/** What a caller passes; every key is filtered by {@link redactPayload}. */
export type LogPayload = Record<string, unknown>;

/** The two files the log lives in. `current` is rewritten wholesale on flush. */
export type LogSlot = 'current' | 'previous';

/**
 * Persistence backend. One interface, a platform-split implementation
 * (`sink.native.ts` / `sink.web.ts`, with `sink.ts` as the Node/no-op default).
 * Deliberately dumb: read/write/remove text. Rotation and the 7-day purge are
 * pure decisions taken above it, from the entry timestamps in the text itself.
 */
export interface LogSink {
  read(slot: LogSlot): Promise<string | null>;
  write(slot: LogSlot, text: string): Promise<void>;
  remove(slot: LogSlot): Promise<void>;
}
