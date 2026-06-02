import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import TendancesTriangle from '@/components/tendances-triangle';
import type { Character } from '@/db/schema';
import { asNumRecord } from '@/lib/character-values';
import { useStatus } from '@/lib/status-context';

export default function StatusTendances() {
  const { char, persistChar } = useStatus();
  const theme = useTheme();
  const rec = asNumRecord(char);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Valeur : appui +1, appui long −1
      </Text>
      <TendancesTriangle
        get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })}
        onValue={(k, delta) =>
          persistChar({ [k]: Math.max(0, (rec[k] ?? 0) + delta) } as Partial<Character>)
        }
        onSub={(k, n) => persistChar({ [`${k}Sub`]: n } as Partial<Character>)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  hint: { fontSize: 12 },
});
