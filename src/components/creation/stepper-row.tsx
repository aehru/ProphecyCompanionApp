// A « name, −, value, + » line — Maîtrise / Chance points, compétence scores.

import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function StepperRow({
  label,
  caption,
  value,
  canDec,
  canInc,
  onStep,
  testID,
}: {
  label: string;
  /** Small grey line under the name (« base 6 », « 7 pts pour 8 »). */
  caption?: string;
  value: number;
  canDec: boolean;
  canInc: boolean;
  onStep: (delta: number) => void;
  testID?: string;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {caption ? (
          <Text style={[styles.caption, { color: theme.colors.onSurfaceVariant }]}>{caption}</Text>
        ) : null}
      </View>
      <IconButton
        icon="minus"
        mode="outlined"
        size={16}
        disabled={!canDec}
        accessibilityLabel={`${label} moins un`}
        onPress={() => onStep(-1)}
      />
      <Text variant="titleMedium" style={styles.value}>
        {value}
      </Text>
      <IconButton
        icon={dsIcon('plus')}
        mode="outlined"
        size={16}
        disabled={!canInc}
        accessibilityLabel={`${label} plus un`}
        onPress={() => onStep(1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, minWidth: 0 },
  label: { fontSize: 16 },
  caption: { fontSize: 12 },
  value: { minWidth: 32, textAlign: 'center' },
});
