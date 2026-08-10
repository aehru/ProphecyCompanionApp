// Session id for the diagnostic log.
//
// Deliberately NOT device-derived and NEVER persisted: it exists only to tell
// "these lines came from the same launch" apart in a shared report. A new one is
// minted every time the module loads, and nothing correlates two launches — so a
// report a tester sends today cannot be linked to one they sent last week.
//
// Pure — reuses the dependency-free uuid generator (no native crypto module).

import { newUuid } from '@/lib/uuid';

/** 12 hex chars — enough to disambiguate, short enough to read in a log line. */
export function newSessionId(): string {
  return newUuid().replace(/-/g, '').slice(0, 12);
}

/** This launch's id. Module-scoped, in memory only. */
export const SESSION_ID = newSessionId();
