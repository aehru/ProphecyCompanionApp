import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, IconButton, Text } from 'react-native-paper';

import { RESOURCES } from '@/constants/prophecy';
import { asNumRecord } from '@/lib/character-values';
import { useStatus } from '@/lib/status-context';

export default function StatusRessources() {
  const { char, state, persistState } = useStatus();
  const charRec = asNumRecord(char);
  const stRec = asNumRecord(state);

  type Patch = Parameters<typeof persistState>[0];

  const adjust = (key: string, delta: number) => {
    const max = charRec[`${key}Max`] ?? 0;
    let next = (stRec[`${key}Current`] ?? 0) + delta;
    if (next < 0) next = 0;
    if (max > 0 && next > max) next = max;
    persistState({ [`${key}Current`]: next } as Patch);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleMedium">Ressources</Text>
      {RESOURCES.map((r) => {
        const cur = stRec[`${r.key}Current`] ?? 0;
        const max = charRec[`${r.key}Max`] ?? 0;
        return (
          <View key={r.key}>
            <View style={styles.row}>
              <Text style={styles.label}>{r.label}</Text>
              <IconButton
                icon="minus"
                mode="contained"
                size={18}
                disabled={cur <= 0}
                onPress={() => adjust(r.key, -1)}
              />
              <Text style={styles.count}>
                {cur} / {max}
              </Text>
              <IconButton
                icon="plus"
                mode="contained"
                size={18}
                disabled={max > 0 && cur >= max}
                onPress={() => adjust(r.key, 1)}
              />
              <IconButton
                icon="refresh"
                size={18}
                onPress={() => persistState({ [`${r.key}Current`]: max } as Patch)}
              />
            </View>
            <Divider />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 16 },
  count: { minWidth: 56, textAlign: 'center', fontSize: 16 },
});
