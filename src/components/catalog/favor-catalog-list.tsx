import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import CatalogRow from '@/components/catalog-row';
import CasteCatalogList from '@/components/catalog/caste-catalog-list';
import FavorDetail from '@/components/favor-detail';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { GREAT_DRAGONS } from '@/constants/prophecy';
import type { FavorPreset } from '@/data/favor-catalog';
import { useCreateFavor, useHouseFavors } from '@/hooks/use-favor-catalog';
import type { Favorites } from '@/hooks/use-favorites';
import { favorPresetId, favorsForDragon, favorVariantOf } from '@/lib/favor';
import { statutRoman } from '@/lib/statut';

/**
 * The Faveurs, one section per Great Dragon, on the `<CasteCatalogList>` shell
 * keyed by dragon. The rulebook's are granted by the Lien and carry nothing to
 * pick; the device's « Maison » ones sit after the rulebook one of their level,
 * and read from an Élu (`favorites`) each carries the star that makes that Élu
 * hold it. `dragon` narrows the page to one section — the Élu's own.
 *
 * « Nouvelle Faveur maison » floats as a FAB so it is reachable without
 * scrolling. It writes for the Élu's dragon, or the first one when read outside
 * a character — the editor's Dragon field is right there to change it.
 */
export default function FavorCatalogList({
  favorites,
  dragon,
}: {
  favorites?: Favorites;
  dragon?: string | null;
}) {
  const house = useHouseFavors();
  const create = useCreateFavor();
  const sections = dragon ? GREAT_DRAGONS.filter((d) => d.key === dragon) : GREAT_DRAGONS;

  return (
    <View style={styles.root}>
      <CasteCatalogList
        icon="dragon"
        emptyLabel="Faveurs pas encore saisies."
        sections={sections}
        fabClearance
        renderCaste={(d) =>
          favorsForDragon(d, house).map((f) => (
            <FavorRow key={favorPresetId(f)} favor={f} favorites={f.custom ? favorites : undefined} />
          ))
        }
      />
      <AppFab
        icon={dsIcon('plus')}
        label="Nouvelle Faveur"
        onPress={() => create({ dragon: (sections[0] ?? GREAT_DRAGONS[0]).key })}
      />
    </View>
  );
}

/** One Faveur: a house one is edited, a rulebook one is a variant's starting point. */
function FavorRow({ favor: f, favorites }: { favor: FavorPreset; favorites?: Favorites }) {
  const router = useRouter();
  const create = useCreateFavor();
  return (
    <CatalogRow
      icon="dragon"
      name={`${statutRoman(f.niveau)} · ${f.nom}`}
      subtitle={f.usages}
      badge={f.custom ? 'Maison' : undefined}
      presetId={f.id}
      favorites={favorites}>
      <FavorDetail favor={f} />
      {f.custom ? (
        <Button
          mode="outlined"
          icon={dsIcon('edit')}
          style={styles.action}
          onPress={() => router.push(`/favor/${f.id}`)}>
          Modifier
        </Button>
      ) : (
        <Button
          mode="outlined"
          icon={dsIcon('plus')}
          style={styles.action}
          onPress={() => create(favorVariantOf(f))}>
          Créer une variante maison
        </Button>
      )}
    </CatalogRow>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  action: { alignSelf: 'flex-start' },
});
