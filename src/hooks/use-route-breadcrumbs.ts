// Route-change breadcrumbs — the "what was the user doing just before it broke"
// half of a diagnostic report.
//
// Only the pathname is logged. Prophecy routes carry local row ids
// (`/character/12`, `/campaigns/3/compagnie`) and never user-authored text, so
// the breadcrumb is an opaque reference by construction. Written at `debug`:
// navigation is high-frequency and a released build sits at `info`.

import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { log } from '@/lib/log';

export function useRouteBreadcrumbs(): void {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current === pathname) return;
    log.debug('route.change', { from: previous.current ?? undefined, to: pathname });
    previous.current = pathname;
  }, [pathname]);
}
