import { useEffect, useRef, useState } from 'react';

import { detachWrite } from '@/repositories/log';

/**
 * Controlled text state that mirrors `external` but persists changes via
 * `persist` only after `delay` ms of inactivity. Avoids a DB write (and the
 * re-render / live-query refetch it triggers) on every keystroke.
 *
 * `external` is adopted only when it changes from a value we did NOT write, so a
 * debounced flush can't clobber what the user is currently typing. This assumes
 * a single writer per field, which holds for the form's free-text inputs.
 *
 * `persist` is almost always a repository write handed in bare. Nobody awaits
 * it — the flush fires from a timer — so a rejection would be an unhandled one
 * and the field would keep showing a value the row never took. The promise is
 * therefore routed through `detachWrite` here, once, rather than at every
 * call site.
 */
export function useDebouncedText(
  external: string,
  persist: (value: string) => void | Promise<unknown>,
  delay = 400,
) {
  const [value, setValue] = useState(external);
  const lastSent = useRef(external);
  // Kept in a ref so the debounce effect below always calls the latest `persist`
  // without restarting its timer. Assigned in an effect, not during render:
  // writing a ref while rendering is a side effect the React Compiler rejects.
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(() => {
    if (external !== lastSent.current) {
      lastSent.current = external;
      setValue(external);
    }
  }, [external]);

  useEffect(() => {
    if (value === external) return;
    const id = setTimeout(() => {
      lastSent.current = value;
      const write = persistRef.current(value);
      if (write instanceof Promise) detachWrite('field', write);
    }, delay);
    return () => clearTimeout(id);
  }, [value, external, delay]);

  return [value, setValue] as const;
}
