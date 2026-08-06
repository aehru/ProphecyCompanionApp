// Live tail for the Diagnostic screen: re-reads the ring buffer whenever it
// changes, throttled so a burst of debug-level writes can't turn into a burst of
// re-renders. Only mounted while the screen is open — nothing subscribes to the
// logger otherwise.

import { useEffect, useState } from 'react';

import { log, type LogEntry } from '@/lib/log';

/** Coalescing window: fast enough to feel live, slow enough to stay cheap. */
const THROTTLE_MS = 250;

export function useLogTail(): LogEntry[] {
  const [entries, setEntries] = useState<LogEntry[]>(() => log.entries());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = log.subscribe(() => {
      if (timer != null) return;
      timer = setTimeout(() => {
        timer = null;
        setEntries(log.entries());
      }, THROTTLE_MS);
    });
    return () => {
      if (timer != null) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return entries;
}
