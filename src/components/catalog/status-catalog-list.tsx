import React from 'react';

import CasteCatalogList from '@/components/catalog/caste-catalog-list';
import CatalogRow from '@/components/catalog-row';
import StatutDetail from '@/components/statut-detail';
import { ladder, rungLabel } from '@/lib/statut';

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
        // The black ladder follows the normal one.
        const rungs = [...ladder(caste, false), ...ladder(caste, true)];
        if (rungs.length === 0) return null;
        return rungs.map((rung) => (
          <CatalogRow
            key={`${rung.darkOrders ? 'noir-' : ''}${rung.niveau}`}
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
