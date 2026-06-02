import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Text, TextInput, useTheme } from 'react-native-paper';

import Bullets from '@/components/bullets';
import { WOUND_LEVELS } from '@/constants/prophecy';
import { asNumRecord } from '@/lib/character-values';
import { useStatus } from '@/lib/status-context';

export default function StatusBlessures() {
  const { char, state, persistState } = useStatus();
  const theme = useTheme();
  const charRec = asNumRecord(char);
  const stRec = asNumRecord(state);

  const resetWounds = () =>
    persistState({
      egratinureCurrent: 0,
      legereCurrent: 0,
      graveCurrent: 0,
      fataleCurrent: 0,
      mortCurrent: 0,
    });

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="titleMedium">Santé</Text>
      {WOUND_LEVELS.map((w) => {
        const cur = stRec[`${w.key}Current`] ?? 0;
        const max = charRec[`${w.key}Max`] ?? 0;
        return (
          <View key={w.key} style={styles.woundBlock}>
            <View style={styles.woundHead}>
              <Text style={styles.woundLabel}>{w.label}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {cur} / {max}
              </Text>
            </View>
            <Bullets
              count={max}
              filled={cur}
              color={theme.colors.error}
              onSet={(n) => persistState({ [`${w.key}Current`]: n } as Parameters<typeof persistState>[0])}
            />
            <Divider style={styles.divider} />
          </View>
        );
      })}

      <Button mode="outlined" onPress={resetWounds}>
        Réinitialiser les blessures
      </Button>

      <Text variant="titleMedium" style={styles.section}>
        États / conditions
      </Text>
      <TextInput
        label="États / conditions"
        value={state.conditions}
        onChangeText={(t) => persistState({ conditions: t })}
        mode="outlined"
        multiline
      />
      <TextInput
        label="Notes"
        value={state.notes}
        onChangeText={(t) => persistState({ notes: t })}
        mode="outlined"
        multiline
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  section: { marginTop: 8 },
  woundBlock: { gap: 6 },
  woundHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  woundLabel: { flex: 1, fontSize: 16 },
  divider: { marginTop: 6 },
});
