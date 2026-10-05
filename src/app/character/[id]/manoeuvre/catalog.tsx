import React from 'react';

import ManoeuvreCatalogList from '@/components/catalog/manoeuvre-catalog-list';
import { useCharacterId } from '@/hooks/use-character-id';
import { useFavorites } from '@/hooks/use-favorites';

/**
 * The manœuvres catalogue read from a character (modal): the same list as the
 * Catalogues tab, with a star on each row. Starred entries are what the
 * Inventaire's Armes page lists under « Manœuvres ».
 */
export default function ManoeuvreCatalogModal() {
  const favorites = useFavorites(useCharacterId(), 'manoeuvre');
  return <ManoeuvreCatalogList favorites={favorites} />;
}
