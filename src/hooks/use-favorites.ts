// The star state one catalogue needs: which slugs are starred, and how to
// toggle one. A hook rather than four lines in each of the five catalogue
// screens — the Set has to be memoized (the lists pass it into `React.memo`'d
// rows) and that is exactly the part worth writing once.

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo } from 'react';

import type { CatalogKind } from '@/db/schema';
import { favoritesQuery, setFavorite } from '@/repositories/favorites';
import { detachWrite } from '@/repositories/log';

export interface Favorites {
  /** Starred preset slugs. Empty while the query is still loading. */
  ids: ReadonlySet<string>;
  toggle: (presetId: string) => void;
}

export function useFavorites(characterId: number, kind: CatalogKind): Favorites {
  const { data } = useLiveQuery(favoritesQuery(characterId, kind), [characterId, kind]);
  const ids = useMemo(() => new Set((data ?? []).map((r) => r.presetId)), [data]);
  // Not awaited: the star is optimistic like the in-play steppers, and the live
  // query is what puts the real state back on screen. `detachWrite` is what
  // gives the dropped promise an error path instead of an unhandled rejection.
  const toggle = useCallback(
    (presetId: string) => {
      const on = !ids.has(presetId);
      detachWrite('favorites', setFavorite(characterId, kind, presetId, on), {
        characterId,
        kind,
        catalogId: presetId,
      });
    },
    [characterId, kind, ids],
  );
  return { ids, toggle };
}
