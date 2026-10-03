import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

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
  const muted = theme.colors.onSurfaceVariant;
  const rows: [string, string | null | undefined][] = [
    ['Jet', favorRollLabel(favor)],
    ['Durée', favorDurationLabel(favor, vars)],
    ['Usages', favor.usages],
    ['Effet en jeu', favor.inGameEffect],
  ];

  return (
    <View style={styles.root}>
      <Text style={[styles.meta, { color: theme.colors.primary }]}>
        Lien {statutRoman(favor.niveau)}
      </Text>
      {rows.map(([label, value]) =>
        value ? (
          <View key={label} style={styles.row}>
            <Text style={[styles.label, { color: muted }]}>{label}</Text>
            <Text style={[styles.body, { color: theme.colors.onSurface }]}>{value}</Text>
          </View>
        ) : null,
      )}
      <Text style={[styles.label, { color: muted }]}>Description</Text>
      <Text style={[styles.body, { color: muted }]}>{favor.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6, paddingBottom: 10 },
  row: { gap: 2 },
  meta: { fontSize: 12, letterSpacing: 0.3 },
  label: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  body: { fontSize: 13, lineHeight: 19 },
});
