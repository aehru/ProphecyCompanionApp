import React from 'react';

import CasteCatalogList, { CatalogFamilyHeading } from '@/components/catalog/caste-catalog-list';
import ManoeuvreRow from '@/components/manoeuvre/manoeuvre-row';
import { MANOEUVRE_CONTEXTS, MANOEUVRE_FAMILIES } from '@/constants/prophecy';
import { MANOEUVRE_CATALOG } from '@/data/manoeuvre-catalog';
import type { Favorites } from '@/hooks/use-favorites';

/**
 * The combat manœuvres — one section per part of the combat chapter, the
 * rulebook's headings inside each, on the shared `<CasteCatalogList>` shell.
 *
 * Nothing to add: a manœuvre is reference. Read from a character, `favorites`
 * puts the star on each row — that is how a player keeps the ones they use.
 */
export default function ManoeuvreCatalogList({ favorites }: { favorites?: Favorites }) {
  return (
    <CasteCatalogList
      icon="sword"
      emptyLabel="Manœuvres pas encore saisies."
      sections={MANOEUVRE_CONTEXTS}
      renderCaste={(contexte) => {
        const own = MANOEUVRE_CATALOG.filter((m) => m.contexte === contexte);
        if (own.length === 0) return null;
        return MANOEUVRE_FAMILIES.map((f) => {
          const list = own.filter((m) => m.famille === f.key);
          if (list.length === 0) return null;
          return (
            <React.Fragment key={f.key}>
              <CatalogFamilyHeading label={f.label} />
              {list.map((m) => (
                <ManoeuvreRow key={m.id} manoeuvre={m} favorites={favorites} />
              ))}
            </React.Fragment>
          );
        });
      }}
    />
  );
}

