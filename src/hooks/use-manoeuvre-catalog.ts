// The manœuvres catalogue as a reader sees it: the rulebook's entries plus this
// device's « Maison » ones, read through the same preset shape so no list has
// to tell them apart (`preset.custom` is there for the few places that do).

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { MANOEUVRE_CATALOG, type ManoeuvrePreset } from '@/data/manoeuvre-catalog';
import { customManoeuvrePreset } from '@/lib/manoeuvre';
import { customManoeuvresQuery } from '@/repositories/custom-manoeuvres';

/**
 * Rulebook entries first, house ones after, in creation order. The lists group
 * by contexte and famille themselves, so within one heading the book's own
 * order still leads and a table's additions follow it.
 */
export function useManoeuvreCatalog(): ManoeuvrePreset[] {
  const { data } = useLiveQuery(customManoeuvresQuery());
  return useMemo(() => [...MANOEUVRE_CATALOG, ...(data ?? []).map(customManoeuvrePreset)], [data]);
}
