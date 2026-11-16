import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';

import FavorCatalogList from '@/components/catalog/favor-catalog-list';
import { useCharacterId } from '@/hooks/use-character-id';
import { useFavorites } from '@/hooks/use-favorites';
import { characterQuery } from '@/repositories/characters';

/**
 * The Faveurs read from an Élu (modal): their dragon's section only, with a
 * star on each « Maison » entry — a star is how this Élu comes to HOLD one.
 * Rulebook Faveurs carry none: the Lien alone grants them.
 */
export default function FavorCatalogModal() {
  const id = useCharacterId();
  const favorites = useFavorites(id, 'favor');
  const { data } = useLiveQuery(characterQuery(id), [id]);
  return <FavorCatalogList favorites={favorites} dragon={data?.[0]?.chosenBy} />;
}
