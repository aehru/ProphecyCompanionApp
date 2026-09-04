import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import TraitRow from '@/components/trait-card';
import TraitPoolBar from '@/components/trait-pool-bar';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { TRAIT_KINDS } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { traitPool } from '@/lib/trait-pool';
import { traitsQuery } from '@/repositories/traits';

/**
 * The character home's avantages / désavantages section: the point balance
 * first, then both lists, then the way to the catalogue.
 *
 * The BALANCE leads because it is the only number a player checks repeatedly —
 * the entries themselves are picked once at creation and read rarely. It is
 * shown even at zero: a blank space would read as "not filled in yet" on a
 * character who genuinely has none.
 */
export default function TraitsSection({ characterId }: { characterId: number }) {
  const theme = useProphecyTheme();
  const router = useRouter();
  const { data: rows } = useLiveQuery(traitsQuery(characterId), [characterId]);
  const traits = rows ?? [];
  const pool = traitPool(traits);

  return (
    <SectionCard title="AVANTAGES & DÉSAVANTAGES" icon="plusminus">
      <TraitPoolBar pool={pool} />

      {TRAIT_KINDS.map((kind) => {
        const list = traits.filter((t) => t.kind === kind.key);
        if (list.length === 0) return null;
        return (
          <View key={kind.key} style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.colors.onSurfaceVariant }]}>
              {kind.plural}
            </Text>
            {list.map((t) => (
              <TraitRow key={t.id} trait={t} characterId={characterId} />
            ))}
          </View>
        );
      })}

      <Button
        mode="outlined"
        icon={dsIcon('plus')}
        onPress={() => router.push(`/character/${characterId}/trait/catalog`)}>
        Ajouter
      </Button>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 4 },
  groupTitle: { fontSize: 12, letterSpacing: 0.3, marginBottom: 2 },
});
