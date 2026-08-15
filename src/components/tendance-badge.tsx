import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/ui/icon';

/** Repeat delay while a half stays held down (after the long-press threshold). */
const HOLD_MS = 120;
/** Touch slop added on a half's OUTER side only, so the two never overlap. */
const SLOP = 10;
// Ghost chevron tuning. The DS glyph's stroke is baked into the icon set, so the
// only weight lever here is the box size (SvgXml scales the stroke with it) —
// hence a ratio well above a normal inline icon's. The chev only inks the middle
// ~27% of its box once rotated, so it stays clear of the value at these values.
const CHEV_RATIO = 0.32;
const CHEV_INSET = 2;
const CHEV_OPACITY = 0.85;
const CHEV_OPACITY_DIM = 0.3;

type Dir = 1 | -1;

// Hoisted out of the badge: defined inline they would get a new component
// identity every render, remounting on each ±1 tap (same trap as the triangle's
// Unit). The badge passes everything they need down.

/** The ▲/▼ ghost marking a half's direction. Non-interactive. */
function Chevron({
  dir,
  size,
  color,
  dim,
}: {
  dir: Dir;
  size: number;
  color: string;
  dim?: boolean;
}) {
  return (
    <View
      style={[
        styles.chev,
        dir === 1 ? { top: CHEV_INSET } : { bottom: CHEV_INSET },
        {
          opacity: dim ? CHEV_OPACITY_DIM : CHEV_OPACITY,
          transform: [{ rotate: dir === 1 ? '-90deg' : '90deg' }],
        },
      ]}>
      <Icon name="chev" size={size * CHEV_RATIO} color={color} />
    </View>
  );
}

/** One tap zone. Hidden from the screen reader — the disc itself is the control. */
function BadgeHalf({
  dir,
  height,
  wash,
  disabled,
  onAdjust,
  onHold,
  onRelease,
}: {
  dir: Dir;
  height: number;
  wash: string;
  disabled?: boolean;
  onAdjust: (delta: Dir) => void;
  onHold: (delta: Dir) => void;
  onRelease: () => void;
}) {
  return (
    <Pressable
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      disabled={disabled}
      hitSlop={{
        left: SLOP,
        right: SLOP,
        top: dir === 1 ? SLOP : 0,
        bottom: dir === 1 ? 0 : SLOP,
      }}
      onPress={() => onAdjust(dir)}
      onLongPress={() => onHold(dir)}
      onPressOut={onRelease}
      style={({ pressed }) => [
        styles.half,
        { height },
        dir === 1 ? { top: 0 } : { bottom: 0 },
        // Press wash keyed on the disc's own text colour, so it reads on the dark
        // discs (Dragon/Fatalité) and on the white one (Homme) alike.
        pressed && !disabled && { backgroundColor: wash, opacity: 0.16 },
      ]}
    />
  );
}

/**
 * Colored circle holding a tendance value. Editable: the disc splits into two tap
 * zones — upper half +1, lower half −1 — each flagged by a ▲/▼ ghost chevron, so
 * the decrement is visible instead of a hidden long-press. Holding a half repeats
 * it; at `min` the lower half greys out and stops responding.
 */
export default function TendanceBadge({
  value,
  label,
  color,
  textColor,
  border,
  size = 52,
  min = 0,
  onAdjust,
}: {
  value: number;
  /** Tendance name — the screen reader's label for the adjustable. */
  label?: string;
  color: string;
  textColor: string;
  border: string;
  size?: number;
  min?: number;
  onAdjust?: (delta: Dir) => void;
}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);
  // A press that ends outside the half never fires onPressOut on every platform;
  // unmounting mid-hold would otherwise leave the interval running.
  useEffect(() => release, [release]);

  const hold = useCallback(
    (dir: Dir) => {
      release();
      timer.current = setInterval(() => onAdjust?.(dir), HOLD_MS);
    },
    [onAdjust, release],
  );

  const editable = !!onAdjust;
  const canDown = value > min;

  return (
    <View
      accessible
      accessibilityRole={editable ? 'adjustable' : 'text'}
      accessibilityLabel={label}
      accessibilityValue={{ now: value }}
      accessibilityActions={editable ? ACTIONS : undefined}
      onAccessibilityAction={(e) =>
        onAdjust?.(e.nativeEvent.actionName === 'decrement' ? -1 : 1)
      }
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor: border,
        },
      ]}>
      <Text style={{ color: textColor, fontFamily: 'Cinzel_600SemiBold', fontSize: size * 0.42 }}>
        {value}
      </Text>
      {editable ? (
        <>
          <Chevron dir={1} size={size} color={textColor} />
          <Chevron dir={-1} size={size} color={textColor} dim={!canDown} />
          <BadgeHalf
            dir={1}
            height={size / 2}
            wash={textColor}
            onAdjust={onAdjust}
            onHold={hold}
            onRelease={release}
          />
          <BadgeHalf
            dir={-1}
            height={size / 2}
            wash={textColor}
            disabled={!canDown}
            onAdjust={onAdjust}
            onHold={hold}
            onRelease={release}
          />
        </>
      ) : null}
    </View>
  );
}

const ACTIONS = [{ name: 'increment' }, { name: 'decrement' }];

const styles = StyleSheet.create({
  // overflow hidden clips a half's press wash to the disc: the zones are
  // rectangles laid over a circle, so the corners would otherwise bleed out.
  badge: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  half: { position: 'absolute', left: 0, right: 0 },
  chev: { position: 'absolute', alignSelf: 'center', pointerEvents: 'none' },
});
