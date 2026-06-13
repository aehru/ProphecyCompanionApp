import React from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import TendancesTriangle from '@/components/tendances-triangle';
import SectionCard from '@/components/ui/section-card';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, clamp } from '@/lib/character-values';
import { useStatus } from '@/lib/status-context';

export default function StatusTendances() {
  const { char, setCharValue } = useStatus();
  const theme = useProphecyTheme();
  const rec = asNumRecord(char);

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
      <SectionCard title="TENDANCES">
        <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          Valeur : appui +1, appui long −1
        </Text>
        <TendancesTriangle
          get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })}
          onValue={(k, delta) => setCharValue(k, clamp((rec[k] ?? 0) + delta, 0))}
          onSub={(k, n) => setCharValue(`${k}Sub`, n)}
        />
      </SectionCard>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12 },
  hint: { fontSize: 12 },
});
