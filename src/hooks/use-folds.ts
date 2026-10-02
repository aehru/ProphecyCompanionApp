import { useCallback, useState } from 'react';

/**
 * Which catalogue sections are open, keyed by section. Everything starts FOLDED
 * so a long catalogue opens as a short list of headings; a section that should
 * start open (the Favoris block) passes `openByDefault`.
 *
 * `forceOpen` is for an active search: a query that found three entries must not
 * hide them behind a folded header, so everything reads as open while it is set
 * (the same rule the trait and spell catalogues follow).
 */
export function useFolds(forceOpen = false) {
  // Keys the user flipped away from their default.
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = useCallback(
    (key: string) =>
      setFlipped((cur) => {
        const next = new Set(cur);
        if (!next.delete(key)) next.add(key);
        return next;
      }),
    [],
  );
  const isOpen = (key: string, openByDefault = false) =>
    forceOpen || flipped.has(key) !== openByDefault;
  return { isOpen, toggle };
}
