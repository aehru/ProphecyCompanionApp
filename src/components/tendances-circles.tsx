import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';

import { MAX_PUCES, TENDANCES, TENDANCE_BY_KEY, type TendanceKey } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { OVERLAY_INK } from '@/theme/overlayInk';


const DEFAULT_SIZE = 64;
const STROKE = 5;

// The overlay ink is shared with the portrait hero and the identity chips —
// see `theme/overlayInk` for why it is fixed rather than themed.
const OVERLAY_DISC = OVERLAY_INK.scrimDisc;
const OVERLAY_TEXT = OVERLAY_INK.text;

/**
 * The unfilled track is the tendance's OWN colour, faded — not a neutral
 * hairline. A tendance at 0 puces draws no arc at all, and three neutral rings
 * side by side are the same ring three times: the colour is the only thing
 * telling Dragon from Fatalité from Homme, so it has to survive an empty gauge.
 * Faded by opacity rather than by a second hex, so the trio stays the single
 * three-colour list it is everywhere else.
 */
const TRACK_OPACITY = { surface: 0.28, overlay: 0.45 } as const;

export type TendancesTone = 'surface' | 'overlay';

/**
 * One tendance as a ring gauge: the main value sits in the centre, the ring
 * fills with the 0–10 puces (subnumber). Read-only — the dashboard's glanceable
 * stand-in for the editable triangle on the Fiche. The trio keeps its fixed
 * identity colours (Dragon red / Fatalité green / Homme grey via the border).
 *
 * `tone: 'overlay'` is the same gauge drawn over an image (the portrait hero):
 * a dark disc goes in behind the ring so a white Homme ring still reads on a
 * pale photograph, and the value flips to the light ink.
 */
function TendanceGauge({
  tKey,
  value,
  sub,
  size,
  tone,
  showLabel,
}: {
  tKey: TendanceKey;
  value: number;
  sub: number;
  size: number;
  tone: TendancesTone;
  showLabel: boolean;
}) {
  const theme = useProphecyTheme();
  const t = TENDANCE_BY_KEY[tKey];
  const r = (size - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, sub / MAX_PUCES));
  const offset = circ * (1 - progress);
  const overlay = tone === 'overlay';

  return (
    <View style={styles.unit}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {overlay ? (
            // Covers the ring's own band (stroke is centred on r), so the disc
            // is what the gauge is read against rather than the photo.
            <Circle cx={size / 2} cy={size / 2} r={r + STROKE / 2} fill={OVERLAY_DISC} />
          ) : null}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={t.border}
            strokeOpacity={TRACK_OPACITY[tone]}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={t.border}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text
            style={[
              styles.value,
              {
                color: overlay ? OVERLAY_TEXT : theme.colors.onSurface,
                fontSize: Math.round(size * 0.3),
                lineHeight: Math.round(size * 0.35),
              },
            ]}>
            {value}
          </Text>
        </View>
      </View>
      {showLabel ? (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{t.label}</Text>
      ) : null}
    </View>
  );
}

/**
 * The three tendances as ring gauges — a row on a surface, a column when the
 * portrait hero stacks them down the right edge of the illustration.
 */
export default function TendancesCircles({
  get,
  size = DEFAULT_SIZE,
  layout = 'row',
  tone = 'surface',
  // The names are dropped over an image on purpose: the trio IS its colours
  // (red / green / white), and three light captions over a photograph read as
  // clutter where the numbers have to stay legible.
  showLabels = tone === 'surface',
}: {
  get: (key: TendanceKey) => { value: number; sub: number };
  size?: number;
  layout?: 'row' | 'column';
  tone?: TendancesTone;
  showLabels?: boolean;
}) {
  return (
    <View style={layout === 'row' ? styles.row : styles.column}>
      {TENDANCES.map((t) => {
        const { value, sub } = get(t.key);
        return (
          <TendanceGauge
            key={t.key}
            tKey={t.key}
            value={value}
            sub={sub}
            size={size}
            tone={tone}
            showLabel={showLabels}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  column: { alignItems: 'center', gap: 10 },
  unit: { alignItems: 'center', gap: 6 },
  // Inlined rather than spreading StyleSheet.absoluteFillObject, which RN 0.85 dropped.
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontFamily: 'Cinzel_600SemiBold' },
  label: { fontFamily: 'Cinzel_500Medium', fontSize: 12, letterSpacing: 0.4 },
});
