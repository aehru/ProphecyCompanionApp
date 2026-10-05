import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import ManoeuvreRow from '@/components/manoeuvre/manoeuvre-row';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { MANOEUVRE_CATALOG } from '@/data/manoeuvre-catalog';
import { useFavorites } from '@/hooks/use-favorites';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The manœuvres a character has starred, under their weapons — the shortlist a
 * player reads mid-fight, in catalogue order. A star dropped here drops it from
 * the list; the button opens the whole catalogue to star more.
 */
export default function FavoriteManoeuvres({ characterId }: { characterId: number }) {
  const theme = useProphecyTheme();
  const router = useRouter();
  const favorites = useFavorites(characterId, 'manoeuvre');
  // An id the catalogue no longer carries (a renamed slug) is simply not shown.
  const list = MANOEUVRE_CATALOG.filter((m) => favorites.ids.has(m.id));

  return (
    <SectionCard title="Manœuvres" icon="sword">
      {list.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {"Aucune manœuvre favorite. Marquez d'une étoile celles que vous utilisez."}
        </Text>
      ) : (
        <View>
          {list.map((m) => (
            <ManoeuvreRow key={m.id} manoeuvre={m} favorites={favorites} context />
          ))}
        </View>
      )}
      <Button
        mode="outlined"
        icon={dsIcon('sword')}
        style={styles.open}
        onPress={() => router.push(`/character/${characterId}/manoeuvre/catalog`)}>
        Catalogue des manœuvres
      </Button>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  open: { alignSelf: 'flex-start' },
});
