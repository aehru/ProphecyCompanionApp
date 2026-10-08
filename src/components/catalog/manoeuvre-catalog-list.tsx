import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

import CasteCatalogList, { CatalogFamilyHeading } from '@/components/catalog/caste-catalog-list';
import ManoeuvreRow from '@/components/manoeuvre/manoeuvre-row';
import { dsIcon } from '@/components/ui/icon';
import { MANOEUVRE_CONTEXTS, MANOEUVRE_FAMILIES } from '@/constants/prophecy';
import { useCreateManoeuvre } from '@/hooks/use-create-manoeuvre';
import type { Favorites } from '@/hooks/use-favorites';
import { useManoeuvreCatalog } from '@/hooks/use-manoeuvre-catalog';

/**
 * The combat manœuvres — one section per part of the combat chapter, the
 * rulebook's headings inside each, on the shared `<CasteCatalogList>` shell.
 *
 * Nothing is picked INTO a character: read from one, `favorites` puts the star
 * on each row — that is how a player keeps the ones they use. The device's
 * « Maison » entries sit among the rulebook's, after them in each heading, and
 * the header button writes a new one.
 */
export default function ManoeuvreCatalogList({ favorites }: { favorites?: Favorites }) {
  const catalog = useManoeuvreCatalog();
  const create = useCreateManoeuvre();

  return (
    <CasteCatalogList
      icon="sword"
      emptyLabel="Manœuvres pas encore saisies."
      sections={MANOEUVRE_CONTEXTS}
      header={
        <Button mode="outlined" icon={dsIcon('plus')} style={styles.create} onPress={() => create()}>
          Nouvelle manœuvre maison
        </Button>
      }
      renderCaste={(contexte) => {
        const own = catalog.filter((m) => m.contexte === contexte);
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

const styles = StyleSheet.create({
  create: { alignSelf: 'flex-start' },
});

