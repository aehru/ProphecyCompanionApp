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
