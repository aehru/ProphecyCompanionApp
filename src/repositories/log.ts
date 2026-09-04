// One-line diagnostic hook for repository writes.
//
// Every mutating repository function calls this so a shared report shows what
// the app actually changed, in order, without any of what it changed *to*: the
// row is named by its local id and the patch by its COLUMN NAMES only. Column
// names come from `schema.ts`, so they are code identifiers — the values behind
// them (a character's nom, a note, a condition) never reach the logger, and
// would be dropped by the allow-list even if they did.
//
// Level follows frequency, not importance: an `update` is what a stat stepper
// fires on every tap, so it sits at `debug` and stays out of a released build's
// default `info`. Inserts and deletes are rare and structural — they are the
// lines that explain "my character disappeared".

import { log, type LogPayload } from '@/lib/log';

export type WriteOp = 'insert' | 'update' | 'delete';

/**
 * @param entity  table name (`characters`, `actual_state`, …)
 * @param op      what happened
 * @param data    identifiers only — `{ id }`, `{ characterId }`, `{ count }`
 * @param patch   the object being written; only its keys are logged
 */
export function logWrite(
  entity: string,
  op: WriteOp,
  data: LogPayload = {},
  patch?: Record<string, unknown>,
): void {
  const payload: LogPayload = { entity, op, ...data };
  if (patch) payload.fields = Object.keys(patch);
  if (op === 'update') log.debug('repo.write', payload);
  else log.info('repo.write', payload);
}

/**
 * Give a DELIBERATELY un-awaited write an error path.
 *
 * The in-play writers are optimistic on purpose — the local copy moves first so
 * a long-pressed stepper repeats without waiting on SQLite — which means nobody
 * is holding the promise when it rejects. Without this the failure is an
 * unhandled rejection and the UI shows a value the database never took.
 *
 * The UI is deliberately left alone: reverting a wound tap mid-fight, with no
 * room to explain why, is worse than a stale number that the next focus re-reads
 * from the row. What the failure gets is a line in the diagnostic log, at
 * `error` — which also flushes immediately (see lib/log/logger) — so a bug
 * report carries it.
 *
 * Called at the site that fires the write, not threaded through the repository:
 * the repository has no idea it was called without an `await`.
 */
export function detachWrite(entity: string, promise: Promise<unknown>, data: LogPayload = {}): void {
  promise.catch((error) => log.error('repo.write.failed', error, { entity, ...data }));
}
