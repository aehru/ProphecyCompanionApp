import React from 'react';
import { View } from 'react-native';

import ManoeuvreCatalogList from '@/components/catalog/manoeuvre-catalog-list';
import TipCard from '@/components/ui/tip-card';
import { useCharacterId } from '@/hooks/use-character-id';
import { useFavorites } from '@/hooks/use-favorites';

/**
 * The manœuvres catalogue read from a character (modal): the same list as the
 * Catalogues tab, with a star on each row. Starred entries are what the
 * Inventaire's Armes page lists under « Manœuvres ».
 */
export default function ManoeuvreCatalogModal() {
  const favorites = useFavorites(useCharacterId(), 'manoeuvre');
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <TipCard screen="manoeuvres" />
      </View>
      <ManoeuvreCatalogList favorites={favorites} />
    </View>
  );
}
