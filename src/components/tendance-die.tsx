import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Polygon } from 'react-native-svg';

import { TENDANCE_BY_KEY } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { TendanceRoll } from '@/lib/dice';

const SIZE = 68;

/**
 * The die, traced off `assets/images/d10.svg` (kept in the repo as the source of
 * these numbers) with its engraved numerals dropped — a die that reads « 7 » on
 * its front and « 4 » on a side is a die nobody trusts.
 *
 * The original is ONE black path: five facet outlines plus six numeral
 * subpaths, two of which are fused into the upper wedges' own contours, so the
 * numerals cannot be deleted subpath-by-subpath. Traced to absolute coordinates
 * instead and kept as polygons — which is also what lets each facet take its own
 * fill, impossible with the flat single-colour original.
 *
 * The art is mirror-symmetric about x = 256; the right-hand wedge below is that
 * mirror, not a second tracing, so the two can't drift apart.
 */
const FACETS = {
  /** The upper kite — the face a real d10 lands on, and where the value goes. */
  top: '255.99,26 137.46,231.03 255.99,286.08 374.59,231.03',
  upperLeft: '27.19,248.87 227.03,35.44 124.93,215.02 119.23,225.08',
  upperRight: '484.79,248.87 284.95,35.44 387.05,215.02 392.75,225.08',
  lowerLeft: '121.60,244.33 36.89,266.10 246.47,486.00 246.47,302.38 136.53,251.24',
  lowerRight: '375.48,251.24 265.50,302.38 265.72,485.76 477.01,266.35 390.02,244.54',
} as const;

/**
 * The outer hull. Painted FIRST, in the tendance's dark `border`: the facets
 * above it don't touch, so the gutters the original art leaves between them show
 * this through as the die's edges. No stroke anywhere — the seams ARE the gap.
 *
 * NINE points, not the six a d10 silhouette looks like it has. The top is a
 * little roof: the apex (255.99, 26) belongs to the top facet alone, and the two
 * wedges start lower and wider, at the shoulders y = 35.44. Cutting straight
 * from the apex to the far corners — the obvious hexagon — passes UNDER those
 * shoulders, so the wedges hang outside the hull with no dark behind them and
 * the die reads as an open shell with two horns.
 */
const SILHOUETTE =
  '255.99,26 284.95,35.44 484.79,248.87 477.01,266.35 265.72,485.76 246.47,486.00 36.89,266.10 27.19,248.87 227.03,35.44';

/**
 * Facet shading, in place of the light source the flat art has no room for: the
 * top face carries the value at full colour, the wedges step back, the two
 * lower faces fall away. Blending toward the dark silhouette underneath rather
 * than mixing new colours keeps the trio's fixed identity colours exact.
 */
const TOP_OPACITY = 1;
const UPPER_OPACITY = 0.88;
const LOWER_OPACITY = 0.72;

/**
 * One tendance's D10 result, printed on the top face of a die in that
 * tendance's colour.
 *
 * Read-only on purpose: nothing marks a die as "the kept one" (see
 * `rollTendances`). The trio keeps its fixed identity colours — Dragon red,
 * Fatalité green, Homme white — which is why they come from `TENDANCES` and
 * not from the theme.
 */
export default function TendanceDie({
  roll,
  selected,
  dimmed,
  onSelect,
}: {
  roll: TendanceRoll;
  /** The die the player kept — ringed, and the only one at full strength. */
  selected?: boolean;
  /** Another die was kept: this one steps back rather than disappearing. */
  dimmed?: boolean;
  /** Omitted for a contextless roll, where there is nothing to keep. */
  onSelect?: () => void;
}) {
  const theme = useProphecyTheme();
  const t = TENDANCE_BY_KEY[roll.key];

  const die = (
    <View style={styles.unit}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 512 512">
          <Polygon points={SILHOUETTE} fill={t.border} />
          <Polygon points={FACETS.lowerLeft} fill={t.color} fillOpacity={LOWER_OPACITY} />
          <Polygon points={FACETS.lowerRight} fill={t.color} fillOpacity={LOWER_OPACITY} />
          <Polygon points={FACETS.upperLeft} fill={t.color} fillOpacity={UPPER_OPACITY} />
          <Polygon points={FACETS.upperRight} fill={t.color} fillOpacity={UPPER_OPACITY} />
          <Polygon points={FACETS.top} fill={t.color} fillOpacity={TOP_OPACITY} />
        </Svg>
        {/* The value sits in the top facet, not in the middle of the box: the
            facet's centre is at 38% of the height, so the overlay is cut short
            at the bottom rather than centred on the die. */}
        <View style={styles.center}>
          <Text style={[styles.value, { color: t.textColor }]}>{roll.value}</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{t.label}</Text>
    </View>
  );

  if (!onSelect) return die;
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`Garder ${t.label} : ${roll.value}`}
      style={[
        styles.pick,
        dimmed && styles.dimmed,
        selected && { borderColor: t.border, backgroundColor: theme.colors.surfaceVariant },
      ]}>
      {die}
    </Pressable>
  );
}

/**
 * The three tendance dice as one row — the whole result of a tendance roll.
 *
 * `onSelect` is what turns the row from a reading into a choice: with a context
 * attached the player KEEPS one die and it becomes the roll, so the three have
 * to be tappable. Without one there is nothing to keep and they stay a display.
 */
export function TendanceDiceRow({
  rolls,
  selectedIndex,
  onSelect,
}: {
  rolls: readonly TendanceRoll[];
  /** Addressed by POSITION, not by tendance: it is a `RollThrow.keptIndex`. */
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
}) {
  return (
    <View style={styles.row}>
      {rolls.map((roll, i) => (
        <TendanceDie
          key={roll.key}
          roll={roll}
          selected={selectedIndex === i}
          dimmed={selectedIndex != null && selectedIndex !== i}
          onSelect={onSelect ? () => onSelect(i) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10 },
  // A transparent border at rest so keeping a die doesn't shift the row.
  pick: { borderWidth: 1, borderColor: 'transparent', borderRadius: 12, padding: 4 },
  dimmed: { opacity: 0.45 },
  unit: { alignItems: 'center', gap: 4 },
  // Inlined rather than spreading StyleSheet.absoluteFillObject, which RN 0.85 dropped.
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '24%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontFamily: 'Cinzel_600SemiBold', fontSize: 19, lineHeight: 22 },
  label: { fontFamily: 'Cinzel_500Medium', fontSize: 11, letterSpacing: 0.4 },
});
