import React from 'react';
import { StyleSheet, View } from 'react-native';

import Bullets from '@/components/bullets';
import TendanceBadge from '@/components/tendance-badge';
import { MAX_PUCES, TENDANCES } from '@/constants/prophecy';

type TendanceKey = (typeof TENDANCES)[number]['key'];

// Where a unit's puces sit relative to its disc, so the three discs stay in a
// tight triangle and the bullets fan outward (Dragon above, Fatalité left,
// Homme right) instead of pushing the discs apart.
type Placement = 'top' | 'left' | 'right';

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
      color={t.color}
      textColor={t.textColor}
      border={t.border}
      onPress={onValue ? () => onValue(tKey, 1) : undefined}
      onLongPress={onValue ? () => onValue(tKey, -1) : undefined}
    />
  );
  const bullets = (
    <Bullets
      count={MAX_PUCES}
      filled={sub}
      perRow={5}
      size={14}
      gap={3}
      color={onSub ? t.color : undefined}
      onSet={onSub ? (n) => onSub(tKey, n) : undefined}
    />
  );

  // Dragon (top): puces stacked directly above the disc.
  if (placement === 'top') {
    return <View style={styles.unitTop}>{bullets}{badge}</View>;
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
 * The three tendances as a tight triangle: Dragon on top (puces above),
 * Fatalité bottom-left (puces left), Homme bottom-right (puces right).
 * Pass onValue/onSub to make it editable (badge tap ±1, puces tappable).
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
  unitTop: { alignItems: 'center', gap: 2 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowReverse: { flexDirection: 'row-reverse' },
});
