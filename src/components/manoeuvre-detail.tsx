import React from 'react';
import { StyleSheet, View } from 'react-native';

import LabeledRows from '@/components/ui/labeled-rows';
import type { ManoeuvrePreset } from '@/data/manoeuvre-catalog';
import { ratingLabel } from '@/lib/manoeuvre';

/**
 * One manœuvre, read-only — the catalogue row's body and the Inventaire's
 * favourites alike. The four-line block and the mechanical half lead, the
 * rulebook paragraph follows: the order `FavorDetail` uses.
 */
export default function ManoeuvreDetail({ manoeuvre }: { manoeuvre: ManoeuvrePreset }) {
  const { stats } = manoeuvre;
  return (
    <View style={styles.root}>
      <LabeledRows
        rows={[
          ['Difficulté', stats && ratingLabel(stats.difficulty)],
          ['Esquive', stats && ratingLabel(stats.dodge)],
          ['Parade', stats && ratingLabel(stats.parry)],
          ['Dommages', stats?.damage],
          ['Jet', manoeuvre.roll],
          ['Effet en jeu', manoeuvre.inGameEffect],
          ['Description', manoeuvre.description, true],
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6, paddingBottom: 10 },
});
