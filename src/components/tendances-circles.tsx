import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';

import { MAX_PUCES, TENDANCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

type TendanceKey = (typeof TENDANCES)[number]['key'];

const SIZE = 64;
const STROKE = 5;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/**
 * One tendance as a ring gauge: the main value sits in the centre, the ring
 * fills with the 0–10 puces (subnumber). Read-only — the dashboard's glanceable
 * stand-in for the editable triangle on the Fiche. The trio keeps its fixed
 * identity colours (Dragon red / Fatalité green / Homme grey via the border).
 */
function TendanceGauge({ tKey, value, sub }: { tKey: TendanceKey; value: number; sub: number }) {
  const theme = useProphecyTheme();
  const t = TENDANCES.find((x) => x.key === tKey)!;
  const progress = Math.max(0, Math.min(1, sub / MAX_PUCES));
  const offset = CIRC * (1 - progress);

  return (
    <View style={styles.unit}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={theme.prophecy.borderSoft}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={t.border}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>{value}</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{t.label}</Text>
    </View>
  );
}

/** The three tendances as a row of ring gauges. */
export default function TendancesCircles({
  get,
}: {
  get: (key: TendanceKey) => { value: number; sub: number };
}) {
  return (
    <View style={styles.row}>
      {TENDANCES.map((t) => {
        const { value, sub } = get(t.key);
        return <TendanceGauge key={t.key} tKey={t.key} value={value} sub={sub} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  unit: { alignItems: 'center', gap: 6 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: 'Cinzel_600SemiBold', fontSize: 19, lineHeight: 22 },
  label: { fontFamily: 'Cinzel_500Medium', fontSize: 12, letterSpacing: 0.4 },
});
