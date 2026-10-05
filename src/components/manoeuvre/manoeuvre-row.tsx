import React from 'react';

import CatalogRow from '@/components/catalog-row';
import ManoeuvreDetail from '@/components/manoeuvre-detail';
import { MANOEUVRE_CONTEXTS } from '@/constants/prophecy';
import type { ManoeuvrePreset } from '@/data/manoeuvre-catalog';
import type { Favorites } from '@/hooks/use-favorites';
import { manoeuvreSubtitle } from '@/lib/manoeuvre';

const CONTEXT_LABEL = new Map<string, string>(MANOEUVRE_CONTEXTS.map((c) => [c.key, c.label]));

/**
 * One manœuvre as a catalogue row: tap to read it, star to keep it. `context`
 * badges the row with where it is fought — needed in the favourites list, where
 * the two « Assommer » would otherwise read the same; the catalogue already
 * says it in its section header.
 */
export default function ManoeuvreRow({
  manoeuvre,
  favorites,
  context = false,
}: {
  manoeuvre: ManoeuvrePreset;
  favorites?: Favorites;
  context?: boolean;
}) {
  return (
    <CatalogRow
      icon="sword"
      name={manoeuvre.nom}
      subtitle={manoeuvreSubtitle(manoeuvre.stats)}
      badge={context ? CONTEXT_LABEL.get(manoeuvre.contexte) : undefined}
      presetId={manoeuvre.id}
      favorites={favorites}>
      <ManoeuvreDetail manoeuvre={manoeuvre} />
    </CatalogRow>
  );
}
