import React from 'react';

import CasteCatalogList from '@/components/catalog/caste-catalog-list';
import CatalogRow from '@/components/catalog-row';
import StatutDetail from '@/components/statut-detail';
import { rungLabel, statutsForCaste } from '@/lib/statut';

/**
 * The Statut ladders, read outside any character — one section per caste, five
 * rungs each. The page shell is `<CasteCatalogList>`, shared with the
 * Privilèges: no search and no `onAdd`, since a Statut is never picked from here
 * (it is a number on the sheet, set on the Identité form).
 */
export default function StatusCatalogList() {
  return (
    <CasteCatalogList
      icon="compass"
      emptyLabel="Statuts pas encore saisis."
      renderCaste={(caste) => {
        const ladder = statutsForCaste(caste);
        if (ladder.length === 0) return null;
        return ladder.map((rung) => (
          <CatalogRow
            key={rung.niveau}
            icon="compass"
            name={rungLabel(rung)}
            subtitle={rung.technique?.nom}>
            <StatutDetail rung={rung} />
          </CatalogRow>
        ));
      }}
    />
  );
}
