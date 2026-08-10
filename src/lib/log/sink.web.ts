// Web persistence backend: `localStorage`, same two slots as the native files.
//
// react-native-web has no filesystem, and the log is small and bounded, so
// localStorage is the honest fit. It is origin-scoped and stays on the machine —
// the privacy story is unchanged. If storage is unavailable (private mode with
// a hard quota of 0, SSR), we degrade to memory rather than throw.

import type { LogSink, LogSlot } from './types';

const KEYS: Record<LogSlot, string> = {
  current: 'prophecy.diag.current',
  previous: 'prophecy.diag.previous',
};

function storage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    // Probe: Safari private mode has the API but rejects every write.
    const probe = '__prophecy_diag__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createLogSink(): LogSink {
  const ls = storage();
  if (!ls) {
    const mem = new Map<LogSlot, string>();
    return {
      async read(slot) {
        return mem.get(slot) ?? null;
      },
      async write(slot, text) {
        mem.set(slot, text);
      },
      async remove(slot) {
        mem.delete(slot);
      },
    };
  }
  return {
    async read(slot) {
      try {
        return ls.getItem(KEYS[slot]);
      } catch {
        return null;
      }
    },
    async write(slot, text) {
      try {
        ls.setItem(KEYS[slot], text);
      } catch {
        // quota exceeded — drop this flush, the next one retries
      }
    },
    async remove(slot) {
      try {
        ls.removeItem(KEYS[slot]);
      } catch {
        // ignore
      }
    },
  };
}

export const SINK_DESCRIPTION = 'stockage local du navigateur, sur cette machine';
