import { useEffect, useState } from 'react';

/** Minimal slice of a navigation object: just the `blur` event subscription. */
type BlurNavigation = { addListener: (type: 'blur', callback: () => void) => () => void };

/**
 * Screen-level read/edit toggle that drops back to the read view when the tab
 * loses focus, so a character screen never reopens still in edit mode.
 */
export function useEditToggle(navigation: BlurNavigation) {
  const [editing, setEditing] = useState(false);
  useEffect(() => navigation.addListener('blur', () => setEditing(false)), [navigation]);
  return [editing, setEditing] as const;
}
