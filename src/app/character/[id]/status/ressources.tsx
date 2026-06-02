import React, { useRef } from 'react';
import { ScrollView, StyleSheet, type TextInput as RNTextInput, View } from 'react-native';
import { Button, Divider, IconButton, Text, useTheme } from 'react-native-paper';

import NumberField from '@/components/number-field';
import { RESOURCES } from '@/constants/prophecy';
import { asNumRecord, clamp } from '@/lib/character-values';
import { useStatus } from '@/lib/status-context';

export default function StatusRessources() {
  const { char, state, persistState, setStateValue } = useStatus();
  const theme = useTheme();
  const charRec = asNumRecord(char);
  const stRec = asNumRecord(state);

  const adjust = (key: string, delta: number) =>
    setStateValue(
      `${key}Current`,
      clamp((stRec[`${key}Current`] ?? 0) + delta, 0, charRec[`${key}Max`] ?? 0),
    );

  const initiativeMax = charRec.initiativeMax ?? 0;
  const stored = state.initiativeValues ?? [];
  const initValues = Array.from({ length: initiativeMax }, (_, i) => stored[i] ?? 0);

  const initRefs = useRef<(RNTextInput | null)[]>([]);

  const setInitValue = (i: number, n: number) => {
    const next = Array.from({ length: initiativeMax }, (_, j) => (j === i ? n : stored[j] ?? 0));
    persistState({ initiativeValues: next });
  };
  const newTurn = () => persistState({ initiativeValues: [] });

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
                onPress={() => setStateValue(`${r.key}Current`, max)}
              />
            </View>
            <Divider />
          </View>
        );
      })}

      <Text variant="titleMedium" style={styles.section}>
        Initiative
      </Text>
      {initiativeMax > 0 ? (
        <>
          <View style={styles.grid}>
            {initValues.map((val, i) => (
              <NumberField
                key={i}
                fieldKey={String(i)}
                label={`Dé ${i + 1}`}
                value={String(val)}
                onChange={(key, t) => setInitValue(Number(key), parseInt(t, 10) || 0)}
                inputRef={(el) => {
                  initRefs.current[i] = el;
                }}
                returnKeyType={i < initValues.length - 1 ? 'next' : 'done'}
                submitBehavior={i < initValues.length - 1 ? 'submit' : 'blurAndSubmit'}
                onSubmitEditing={() => initRefs.current[i + 1]?.focus()}
              />
            ))}
          </View>
          <Button mode="outlined" onPress={newTurn}>
            Nouveau tour
          </Button>
        </>
      ) : (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Définis l’initiative (max) dans la fiche.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  section: { marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 16 },
  count: { minWidth: 56, textAlign: 'center', fontSize: 16 },
});
