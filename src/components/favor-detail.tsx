import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import LabeledRows from '@/components/ui/labeled-rows';
import type { FavorPreset } from '@/data/favor-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { favorDurationLabel, favorRollLabel } from '@/lib/favor';
import type { FormulaVars } from '@/lib/formula';
import { statutRoman } from '@/lib/statut';

/**
 * One Faveur, read-only. Shared by the character home and the Catalogues tab,
 * like `StatutDetail`. The mechanical half leads (jet, durée, usages, effet en
 * jeu) and the rulebook paragraph follows — the order `SpellDetail` uses.
 * `vars` resolves the durée against a character; the catalogue passes none.
 */
export default function FavorDetail({ favor, vars }: { favor: FavorPreset; vars?: FormulaVars }) {
  const theme = useProphecyTheme();

  return (
    <View style={styles.root}>
      <Text style={[styles.meta, { color: theme.colors.primary }]}>
        Lien {statutRoman(favor.niveau)}
      </Text>
      <LabeledRows
        rows={[
          ['Jet', favorRollLabel(favor)],
          ['Durée', favorDurationLabel(favor, vars)],
          ['Usages', favor.usages],
          ['Effet en jeu', favor.inGameEffect],
          ['Description', favor.description, true],
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6, paddingBottom: 10 },
  meta: { fontSize: 12, letterSpacing: 0.3 },
});
