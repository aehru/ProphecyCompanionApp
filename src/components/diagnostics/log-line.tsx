import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formatTime, type LogEntry, type LogLevel } from '@/lib/log';

/** Monospace so timestamps and levels line up column-wise down the tail. */
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * One line of the live tail: time · level · event name, then the redacted
 * payload and (for an error) the message and stack. Everything shown here is
 * exactly what a shared report contains — no hidden extra detail.
 */
export default function LogLine({ entry }: { entry: LogEntry }) {
  const theme = useProphecyTheme();
  const colors: Record<LogLevel, string> = {
    debug: theme.colors.onSurfaceVariant,
    info: theme.colors.onSurface,
    warn: theme.colors.tertiary,
    error: theme.colors.error,
  };
  const accent = colors[entry.lvl];

  return (
    <View style={[styles.row, { borderColor: theme.prophecy.borderSoft }]}>
      <View style={styles.head}>
        <Text style={[styles.time, { color: theme.colors.onSurfaceVariant, fontFamily: MONO }]}>
          {formatTime(entry.t).slice(11)}
        </Text>
        <Text style={[styles.level, { color: accent, fontFamily: MONO }]}>
          {entry.lvl.toUpperCase()}
        </Text>
        <Text style={[styles.msg, { color: accent }]} numberOfLines={1}>
          {entry.msg}
        </Text>
      </View>
      {entry.data ? (
        <Text
          style={[styles.detail, { color: theme.colors.onSurfaceVariant, fontFamily: MONO }]}
          numberOfLines={3}>
          {JSON.stringify(entry.data)}
        </Text>
      ) : null}
      {entry.err ? (
        <Text style={[styles.detail, { color: theme.colors.error, fontFamily: MONO }]}>
          {entry.err.name}: {entry.err.message}
        </Text>
      ) : null}
      {entry.err?.stack ? (
        <Text
          style={[styles.stack, { color: theme.colors.onSurfaceVariant, fontFamily: MONO }]}
          numberOfLines={6}>
          {entry.err.stack}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  time: { fontSize: 11 },
  level: { fontSize: 11, width: 44 },
  msg: { flex: 1, fontSize: 13 },
  detail: { fontSize: 11, marginLeft: 8 },
  stack: { fontSize: 10, marginLeft: 8, opacity: 0.8 },
});
