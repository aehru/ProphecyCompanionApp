import { useEffect, useRef, useState } from 'react';

/**
 * Controlled text state that mirrors `external` but persists changes via
 * `persist` only after `delay` ms of inactivity. Avoids a DB write (and the
 * re-render / live-query refetch it triggers) on every keystroke.
 *
 * `external` is adopted only when it changes from a value we did NOT write, so a
 * debounced flush can't clobber what the user is currently typing. This assumes
 * a single writer per field, which holds for the form's free-text inputs.
 */
export function useDebouncedText(
  external: string,
  persist: (value: string) => void,
  delay = 400,
) {
  const [value, setValue] = useState(external);
  const lastSent = useRef(external);
  const persistRef = useRef(persist);
  persistRef.current = persist;

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
      persistRef.current(value);
    }, delay);
    return () => clearTimeout(id);
  }, [value, external, delay]);

  return [value, setValue] as const;
}
