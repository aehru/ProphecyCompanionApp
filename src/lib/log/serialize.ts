// NDJSON (one JSON object per line) encode/decode for the log files, plus the
// pure retention decisions taken above the sink: is this file stale, and which
// entries survive the 7-day window.
//
// NDJSON rather than one big JSON array because a truncated/corrupt tail then
// costs exactly one line instead of the whole file.
//
// Pure — no framework imports (see `types.ts`).

import { LEVEL_LABELS, type LogEntry, isLogLevel } from './types';

/** Retention window: nothing older than this is kept on disk. */
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** One entry → one line. */
export function serializeEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/** Byte cost used by the ring buffer's size cap (+1 for the newline). */
export function entrySize(entry: LogEntry): number {
  return serializeEntry(entry).length + 1;
}

export function serializeEntries(entries: readonly LogEntry[]): string {
  return entries.map(serializeEntry).join('\n');
}

/** Parse NDJSON back to entries, skipping any line that doesn't hold up. */
export function parseEntries(text: string | null | undefined): LogEntry[] {
  if (!text) return [];
  const out: LogEntry[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const v = JSON.parse(trimmed) as Partial<LogEntry>;
      if (typeof v.t !== 'number' || typeof v.msg !== 'string' || !isLogLevel(v.lvl)) continue;
      out.push(v as LogEntry);
    } catch {
      // torn line — drop it, keep the rest
    }
  }
  return out;
}

/** Entries within the retention window, oldest first. */
export function pruneOlderThan(entries: readonly LogEntry[], cutoff: number): LogEntry[] {
  return entries.filter((e) => e.t >= cutoff);
}

/**
 * True when a stored file has nothing left inside the window — i.e. it can be
 * removed outright. An unparseable/empty file counts as stale.
 */
export function isStale(text: string | null | undefined, cutoff: number): boolean {
  const entries = parseEntries(text);
  if (entries.length === 0) return true;
  return entries.every((e) => e.t < cutoff);
}

/** `2026-08-06 14:03:27.412` — local time, sortable, no timezone noise. */
export function formatTime(t: number): string {
  const d = new Date(t);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
  );
}

/** One entry as a human-readable line (live tail, clipboard, share file). */
export function formatEntry(entry: LogEntry): string {
  const parts = [formatTime(entry.t), entry.lvl.toUpperCase().padEnd(5), entry.msg];
  if (entry.data) parts.push(JSON.stringify(entry.data));
  if (entry.err) {
    parts.push(`${entry.err.name}: ${entry.err.message}`);
    if (entry.err.stack) parts.push(`\n${entry.err.stack}`);
  }
  return parts.join(' ');
}

/**
 * The shareable report: a short header (so a tester's message is self-contained)
 * then every entry, oldest first. Header fields are technical only — the same
 * allow-list spirit as the entries themselves.
 */
export function formatReport(
  entries: readonly LogEntry[],
  meta: { appVersion?: string; platform?: string; level?: string; sessionId?: string } = {},
): string {
  const head = [
    '# Prophecy — journal de diagnostic',
    `# généré : ${formatTime(Date.now())}`,
    meta.appVersion ? `# version : ${meta.appVersion}` : null,
    meta.platform ? `# plateforme : ${meta.platform}` : null,
    meta.level ? `# niveau : ${meta.level} (${LEVEL_LABELS[
      meta.level as keyof typeof LEVEL_LABELS
    ] ?? meta.level})` : null,
    meta.sessionId ? `# session : ${meta.sessionId}` : null,
    `# entrées : ${entries.length}`,
    '# Aucun texte saisi par l’utilisateur n’est enregistré : les personnages',
    '# sont désignés par identifiant technique uniquement.',
    '',
  ].filter(Boolean);
  return [...head, ...entries.map(formatEntry)].join('\n');
}
