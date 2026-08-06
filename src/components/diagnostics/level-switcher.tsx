import React from 'react';
import { StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { LEVEL_LABELS, LOG_LEVELS, type LogLevel } from '@/lib/log';

/**
 * The verbosity switcher. The choice is persisted, so a tester asked to
 * "reproduce it with Détail on" keeps that setting across relaunches.
 */
export default function LevelSwitcher({
  value,
  onChange,
}: {
  value: LogLevel;
  onChange: (level: LogLevel) => void;
}) {
  return (
    <SegmentedButtons
      value={value}
      onValueChange={(v) => onChange(v as LogLevel)}
      density="small"
      style={styles.buttons}
      buttons={LOG_LEVELS.map((level) => ({ value: level, label: LEVEL_LABELS[level] }))}
    />
  );
}

const styles = StyleSheet.create({
  buttons: { alignSelf: 'stretch' },
});
