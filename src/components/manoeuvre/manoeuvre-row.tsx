import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

import CatalogRow from '@/components/catalog-row';
import ManoeuvreDetail from '@/components/manoeuvre-detail';
import { dsIcon } from '@/components/ui/icon';
import { MANOEUVRE_CONTEXTS } from '@/constants/prophecy';
import type { ManoeuvrePreset } from '@/data/manoeuvre-catalog';
import { useCreateManoeuvre } from '@/hooks/use-create-manoeuvre';
import type { Favorites } from '@/hooks/use-favorites';
import { manoeuvreSubtitle, variantOf } from '@/lib/manoeuvre';

const CONTEXT_LABEL = new Map<string, string>(MANOEUVRE_CONTEXTS.map((c) => [c.key, c.label]));

/**
 * One manœuvre as a catalogue row: tap to read it, star to keep it. `context`
 * badges the row with where it is fought — needed in the favourites list, where
 * the two « Assommer » would otherwise read the same; the catalogue already
 * says it in its section header. A « Maison » entry is always badged as such.
 *
 * The detail ends on what can be done with the entry: a house one is edited,
 * a rulebook one is the starting point of a house variant — the rulebook text
 * itself is never edited.
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
  const router = useRouter();
  const create = useCreateManoeuvre();
  const where = context ? CONTEXT_LABEL.get(manoeuvre.contexte) : undefined;
  const badge = manoeuvre.custom ? ['Maison', where].filter(Boolean).join(' · ') : where;


  return (
    <CatalogRow
      icon="sword"
      name={manoeuvre.nom}
      subtitle={manoeuvreSubtitle(manoeuvre.stats)}
      badge={badge}
      presetId={manoeuvre.id}
      favorites={favorites}>
      <ManoeuvreDetail manoeuvre={manoeuvre} />
      {manoeuvre.custom ? (
        <Button
          mode="outlined"
          icon={dsIcon('edit')}
          style={styles.action}
          onPress={() => router.push(`/manoeuvre/${manoeuvre.id}`)}>
          Modifier
        </Button>
      ) : (
        <Button mode="outlined" icon={dsIcon('plus')} style={styles.action} onPress={() => create(variantOf(manoeuvre))}>
          Créer une variante maison
        </Button>
      )}
    </CatalogRow>
  );
}

const styles = StyleSheet.create({
  action: { alignSelf: 'flex-start' },
});
