import React from 'react';
import { StyleSheet, View } from 'react-native';

import Bullets from '@/components/bullets';
import TendanceBadge from '@/components/tendance-badge';
import { MAX_PUCES, TENDANCES } from '@/constants/prophecy';

type TendanceKey = (typeof TENDANCES)[number]['key'];

// Where a unit's puces sit relative to its disc, so the three discs stay in a
// tight triangle and the bullets fan outward (Dragon right, Fatalité left,
// Homme right) instead of pushing the discs apart.
type Placement = 'top' | 'left' | 'right';

// Puce geometry, shared so the Dragon row can reserve a spacer exactly as wide
// as its bullets block and keep the top disc centred over the two below.
const PUCE_SIZE = 16;
const PUCE_GAP = 3;
const PUCE_PER_ROW = 5;
const BULLETS_WIDTH = PUCE_PER_ROW * PUCE_SIZE + (PUCE_PER_ROW - 1) * PUCE_GAP;
const UNIT_GAP = 6;

type UnitProps = {
  tKey: TendanceKey;
  placement: Placement;
  get: (key: TendanceKey) => { value: number; sub: number };
  onValue?: (key: TendanceKey, delta: number) => void;
  onSub?: (key: TendanceKey, n: number) => void;
};

// Hoisted out of the parent render: defining it inline gave it a new component
// identity every render, so React unmounted/remounted all three units on each
// re-render (e.g. every ±1 tap on the editable status screen).
function Unit({ tKey, placement, get, onValue, onSub }: UnitProps) {
  const t = TENDANCES.find((x) => x.key === tKey)!;
  const { value, sub } = get(tKey);

  const badge = (
    <TendanceBadge
      value={value}
      label={t.label}
      color={t.color}
      textColor={t.textColor}
      border={t.border}
      onAdjust={onValue ? (delta) => onValue(tKey, delta) : undefined}
    />
  );
  const bullets = (
    <Bullets
      count={MAX_PUCES}
      filled={sub}
      perRow={PUCE_PER_ROW}
      size={PUCE_SIZE}
      gap={PUCE_GAP}
      color={onSub ? t.color : undefined}
      onSet={onSub ? (n) => onSub(tKey, n) : undefined}
    />
  );

  // Dragon (top): puces to the right of the disc (saves vertical space). The
  // left spacer mirrors the bullets block so the disc stays centred on the
  // triangle's apex instead of being pushed left by them.
  if (placement === 'top') {
    return (
      <View style={styles.unitTop}>
        <View style={styles.topSpacer} />
        {badge}
        {bullets}
      </View>
    );
  }
  // Fatalité (left): bullets on the outer (left) side via row-reverse; Homme
  // (right): bullets on the outer (right) side — disc stays toward the centre.
  return (
    <View style={[styles.unitRow, placement === 'left' && styles.rowReverse]}>
      {badge}
      {bullets}
    </View>
  );
}

/**
 * The three tendances as a tight triangle: Dragon on top (puces right),
 * Fatalité bottom-left (puces left), Homme bottom-right (puces right).
 * Pass onValue/onSub to make it editable (disc halves ±1, puces tappable).
 */
export default function TendancesTriangle({
  get,
  onValue,
  onSub,
}: {
  get: (key: TendanceKey) => { value: number; sub: number };
  onValue?: (key: TendanceKey, delta: number) => void;
  onSub?: (key: TendanceKey, n: number) => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Unit tKey="dragon" placement="top" get={get} onValue={onValue} onSub={onSub} />
      </View>
      <View style={styles.bottom}>
        <Unit tKey="fatalite" placement="left" get={get} onValue={onValue} onSub={onSub} />
        <Unit tKey="homme" placement="right" get={get} onValue={onValue} onSub={onSub} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  top: { alignItems: 'center' },
  // Keep the two lower units on one row (no wrap) and close together so the
  // discs form a tight triangle with Dragon above. Big gaps / wrap break it.
  bottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 8,
  },
  unitTop: { flexDirection: 'row', alignItems: 'center', gap: UNIT_GAP },
  topSpacer: { width: BULLETS_WIDTH },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: UNIT_GAP },
  rowReverse: { flexDirection: 'row-reverse' },
});
