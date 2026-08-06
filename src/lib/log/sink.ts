// Default persistence backend: in memory.
//
// Metro resolves `sink.native.ts` on iOS/Android and `sink.web.ts` on web, so
// this file is what plain Node (vitest, drizzle-kit) and any future platform
// without an override get. Keeping a real implementation here rather than a
// throwing stub means the logger behaves identically in tests — it just doesn't
// survive a reload.
//
// It is also the type-level source of truth: the platform files must export the
// same `createLogSink()` signature.

import type { LogSink, LogSlot } from './types';

export function createLogSink(): LogSink {
  const store = new Map<LogSlot, string>();
  return {
    async read(slot) {
      return store.get(slot) ?? null;
    },
    async write(slot, text) {
      store.set(slot, text);
    },
    async remove(slot) {
      store.delete(slot);
    },
  };
}

/** Where the log lives, for the Privacy screen's plain-language description. */
export const SINK_DESCRIPTION = 'mémoire de l’application (non persistant)';
