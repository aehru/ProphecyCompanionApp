import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Text, TextInput } from 'react-native-paper';

import Bullets from '@/components/bullets';
import SectionCard from '@/components/ui/section-card';
import { WOUND_LEVELS } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { useStatus } from '@/lib/status-context';

export default function StatusBlessures() {
  const { char, state, persistState, setStateValue } = useStatus();
  const theme = useProphecyTheme();
  const charRec = asNumRecord(char);
  const stRec = asNumRecord(state);

  const resetWounds = () =>
    persistState(
      Object.fromEntries(WOUND_LEVELS.map((w) => [`${w.key}Current`, 0])) as Partial<typeof state>,
    );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <SectionCard title="SANTÉ">
        {WOUND_LEVELS.map((w, i) => {
          const cur = stRec[`${w.key}Current`] ?? 0;
          const max = charRec[`${w.key}Max`] ?? 0;
          return (
            <View key={w.key} style={styles.woundBlock}>
              {i > 0 && <Divider style={styles.divider} />}
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
                onSet={(n) => setStateValue(`${w.key}Current`, n)}
              />
            </View>
          );
        })}
        <Button mode="outlined" onPress={resetWounds} style={styles.resetBtn}>
          Don de Heyra !
        </Button>
      </SectionCard>

      <SectionCard title="ÉTATS / CONDITIONS">
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
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  woundBlock: { gap: 6 },
  woundHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  woundLabel: { flex: 1, fontSize: 16 },
  divider: { marginBottom: 6 },
  resetBtn: { marginTop: 8 },
});
