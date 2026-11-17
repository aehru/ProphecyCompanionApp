import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import FavorDetail from '@/components/favor-detail';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { useHouseFavors } from '@/hooks/use-favor-catalog';
import { useFavorites } from '@/hooks/use-favorites';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { eluLabel, favorPresetId, favorsForDragon, favorsUpTo } from '@/lib/favor';
import type { FormulaVars } from '@/lib/formula';

/**
 * An Élu's Faveurs on the character home: every one up to the Lien, since a
 * Faveur once granted is kept. Derived from `chosenBy` + `bond`, nothing stored
 * — same treatment as `StatutBenefitsSection`, and folded for the same reason.
 *
 * « Maison » Faveurs join them once this Élu has starred one in the catalogue
 * the button opens — same Lien rule, listed after the rulebook one of their
 * level and badged so.
 *
 * Renders nothing for a non-Élu. An Élu whose dragon is not typed in yet gets a
 * line saying so rather than an empty card.
 */
export default function FavorsSection({
  characterId,
  dragon,
  bond,
  vars,
}: {
  characterId: number;
  dragon?: string | null;
  bond?: number | null;
  /** The character's values, so « Tendance Dragon tours » or « VOL tours » resolves. */
  vars: FormulaVars;
}) {
  const theme = useProphecyTheme();
  const router = useRouter();
  const starred = useFavorites(characterId, 'favor');
  const house = useHouseFavors().filter((f) => f.id && starred.ids.has(f.id));
  const title = eluLabel(dragon);
  if (!title) return null;
  const favors = favorsUpTo(dragon, bond, house);
  const empty =
    favorsForDragon(dragon).length === 0
      ? 'Faveurs pas encore saisies pour ce Dragon.'
      : favors.length === 0
        ? 'Aucune Faveur au Lien 0.'
        : null;

  return (
    <SectionCard
      title={`FAVEURS · ${title.toUpperCase()}`}
      icon="dragon"
      collapsible
      defaultExpanded={false}>
      {empty ? (
        <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>{empty}</Text>
      ) : (
        favors.map((f) => (
          <View key={favorPresetId(f)} style={[styles.block, { borderBottomColor: theme.prophecy.borderSoft }]}>
            <Text style={[styles.name, { color: theme.colors.secondary }]}>
              {f.custom ? `${f.nom} · Maison` : f.nom}
            </Text>
            <FavorDetail favor={f} vars={vars} />
          </View>
        ))
      )}
      <Button
        mode="outlined"
        icon={dsIcon('dragon')}
        style={styles.open}
        onPress={() => router.push(`/character/${characterId}/favor/catalog`)}>
        Faveurs maison
      </Button>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  block: { gap: 3, marginBottom: 10, borderBottomWidth: 1 },
  name: { fontSize: 13, fontFamily: 'Cinzel_600SemiBold' },
  empty: { fontStyle: 'italic', fontSize: 13 },
  open: { alignSelf: 'flex-start' },
});
