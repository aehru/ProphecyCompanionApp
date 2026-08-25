import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import { TendanceDiceRow } from '@/components/tendance-die';
import DieChip from '@/components/ui/die-chip';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { TendanceRoll } from '@/lib/dice';

/**
 * The body of the free-form roller: N × DX, and the dice that came up.
 *
 * No context, so no difficulté, no verdict and no keeping a tendance die —
 * there is nothing to keep it FOR. This is the roller as it was before rolls
 * could be made against a value, kept whole because « combien font 3d6 » is
 * still a thing a table asks.
 */
const SIDES = [4, 6, 8, 10, 12, 20];

export default function RollFreeformBody({
  count,
  onCount,
  sides,
  onPickSides,
  result,
  tendances,
}: {
  /** Held as text so an emptied field can stay empty while typing. */
  count: string;
  onCount: (text: string) => void;
  sides: number;
  onPickSides: (sides: number) => void;
  result: number[] | null;
  tendances: TendanceRoll[] | null;
}) {
  const theme = useProphecyTheme();
  const [menu, setMenu] = useState(false);
  const total = result ? result.reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <View style={styles.countRow}>
        <NumberField
          fieldKey="count"
          label="Dés"
          value={count}
          onChange={(_, t) => onCount(t)}
          maxLength={2}
          style={styles.countField}
        />
        <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          ×
        </Text>
        <Menu
          visible={menu}
          onDismiss={() => setMenu(false)}
          anchor={
            <Button
              mode="outlined"
              icon={dsIcon('chev')}
              contentStyle={styles.sidesAnchorContent}
              onPress={() => setMenu(true)}>
              {`D${sides}`}
            </Button>
          }>
          {SIDES.map((s) => (
            <Menu.Item
              key={s}
              title={`D${s}`}
              onPress={() => {
                onPickSides(s);
                setMenu(false);
              }}
            />
          ))}
        </Menu>
      </View>

      {tendances ? <TendanceDiceRow rolls={tendances} /> : null}
      {result ? (
        <View style={styles.results}>
          <View style={styles.dice}>
            {result.map((v, i) => (
              // Index-keyed on purpose: these are N throws of one die, so two 7s
              // are genuinely interchangeable and nothing here reorders.
              <DieChip key={i} value={v} />
            ))}
          </View>
          {result.length > 1 ? (
            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
              Total : {total}
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  // Two digits wide — a dice count is never more, and the width freed here is
  // what lets « 2 × D10 » read as one centred phrase instead of a stretched form.
  countField: { flexGrow: 0, flexBasis: 'auto', width: 56, minWidth: 0 },
  // Chevron trailing the "D10" label instead of leading it.
  sidesAnchorContent: { flexDirection: 'row-reverse' },
  results: { alignItems: 'center', gap: 10 },
  dice: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
});
