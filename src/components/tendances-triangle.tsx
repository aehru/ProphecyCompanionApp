import React from 'react';
import { StyleSheet, View } from 'react-native';

import Bullets from '@/components/bullets';
import TendanceBadge from '@/components/tendance-badge';
import { MAX_PUCES, TENDANCES } from '@/constants/prophecy';

type TendanceKey = (typeof TENDANCES)[number]['key'];

type UnitProps = {
  tKey: TendanceKey;
  get: (key: TendanceKey) => { value: number; sub: number };
  onValue?: (key: TendanceKey, delta: number) => void;
  onSub?: (key: TendanceKey, n: number) => void;
};

// Hoisted out of the parent render: defining it inline gave it a new component
// identity every render, so React unmounted/remounted all three units on each
// re-render (e.g. every ±1 tap on the editable status screen).
function Unit({ tKey, get, onValue, onSub }: UnitProps) {
  const t = TENDANCES.find((x) => x.key === tKey)!;
  const { value, sub } = get(tKey);
  return (
    <View style={styles.unit}>
      <TendanceBadge
        value={value}
        color={t.color}
        textColor={t.textColor}
        border={t.border}
        onPress={onValue ? () => onValue(tKey, 1) : undefined}
        onLongPress={onValue ? () => onValue(tKey, -1) : undefined}
      />
      <Bullets
        count={MAX_PUCES}
        filled={sub}
        perRow={5}
        size={14}
        gap={3}
        onSet={onSub ? (n) => onSub(tKey, n) : undefined}
      />
    </View>
  );
}

/**
 * The three tendances laid out as a triangle (Dragon top, Fatalité bottom-left,
 * Homme bottom-right): a colored value badge + the 0–10 puces (2×5) beside it.
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
        <Unit tKey="dragon" get={get} onValue={onValue} onSub={onSub} />
      </View>
      <View style={styles.bottom}>
        <Unit tKey="fatalite" get={get} onValue={onValue} onSub={onSub} />
        <Unit tKey="homme" get={get} onValue={onValue} onSub={onSub} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  top: { alignItems: 'center' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  unit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
