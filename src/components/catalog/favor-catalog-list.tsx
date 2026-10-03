import React from 'react';

import CasteCatalogList from '@/components/catalog/caste-catalog-list';
import CatalogRow from '@/components/catalog-row';
import FavorDetail from '@/components/favor-detail';
import { GREAT_DRAGONS } from '@/constants/prophecy';
import { favorsForDragon } from '@/lib/favor';
import { statutRoman } from '@/lib/statut';

/**
 * The Faveurs, one section per Great Dragon, on the `<CasteCatalogList>` shell
 * keyed by dragon. Nothing to pick: an Élu's Faveurs follow from the Lien set
 * on the Identité form.
 */
export default function FavorCatalogList() {
  return (
    <CasteCatalogList
      icon="dragon"
      emptyLabel="Faveurs pas encore saisies."
      sections={GREAT_DRAGONS}
      renderCaste={(dragon) => {
        const favors = favorsForDragon(dragon);
        if (favors.length === 0) return null;
        return favors.map((f) => (
          <CatalogRow
            key={f.niveau}
            icon="dragon"
            name={`${statutRoman(f.niveau)} · ${f.nom}`}
            subtitle={f.usages}>
            <FavorDetail favor={f} />
          </CatalogRow>
        ));
      }}
    />
  );
}
