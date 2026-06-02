import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import TendancesTriangle from '@/components/tendances-triangle';
import { asNumRecord, clamp } from '@/lib/character-values';
import { useStatus } from '@/lib/status-context';

export default function StatusTendances() {
  const { char, setCharValue } = useStatus();
  const theme = useTheme();
  const rec = asNumRecord(char);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Valeur : appui +1, appui long −1
      </Text>
      <TendancesTriangle
        get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })}
        onValue={(k, delta) => setCharValue(k, clamp((rec[k] ?? 0) + delta, 0))}
        onSub={(k, n) => setCharValue(`${k}Sub`, n)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  hint: { fontSize: 12 },
});
