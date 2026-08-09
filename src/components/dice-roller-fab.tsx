import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import AppFab from '@/components/ui/app-fab';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { rollDice } from '@/lib/dice';

/**
 * Global free-form dice roller — a FAB + dialog to roll any XdY, independent of
 * any character stat (initiative has its own roll on the weapons tab). Prophecy
 * is D10-heavy, so the die picker defaults to 10 and remembers the last die
 * across opens. That memory is a module-level var, not persisted: it survives
 * reopening/navigation within a session but not an app restart — matching the
 * "no roll history" decision.
 */
const SIDES = [4, 6, 8, 10, 12, 20];

// The last die picked, remembered across mounts so reopening the roller keeps
// your die. Reached through accessors rather than assigned directly from the
// component: reassigning an outer binding from inside render is a side effect
// the React Compiler rejects, and it cannot tell a handler from render.
let lastSides = 10;
const getLastSides = () => lastSides;
const rememberSides = (s: number) => {
  lastSides = s;
};

export default function DiceRollerFab() {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState(false);
  const [sidesMenu, setSidesMenu] = useState(false);
  const [count, setCount] = useState(1);
  const [sides, setSides] = useState(getLastSides);
  const [result, setResult] = useState<number[] | null>(null);

  const pickSides = (s: number) => {
    rememberSides(s);
    setSides(s);
    setResult(null);
    setSidesMenu(false);
  };
  const setCountSafe = (t: string) => {
    setCount(Math.max(1, parseInt(t, 10) || 1));
    setResult(null);
  };
  const roll = () => setResult(rollDice(count, sides));

  const total = result ? result.reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <AppFab icon={dsIcon('dice')} onPress={() => setOpen(true)} />
      <DsDialog
        visible={open}
        onDismiss={() => setOpen(false)}
        title="Lancer les dés"
        actions={
          <>
            <Button onPress={() => setOpen(false)}>Fermer</Button>
            <Button mode="contained" icon={dsIcon('dice')} onPress={roll}>
              Lancer
            </Button>
          </>
        }>
        <View style={styles.countRow}>
          <NumberField
            fieldKey="count"
            label="Nombre de dés"
            value={String(count)}
            onChange={(_, t) => setCountSafe(t)}
            style={styles.countField}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            ×
          </Text>
          <Menu
            visible={sidesMenu}
            onDismiss={() => setSidesMenu(false)}
            anchor={
              <Button
                mode="outlined"
                icon={dsIcon('chev')}
                contentStyle={styles.sidesAnchorContent}
                onPress={() => setSidesMenu(true)}>
                {`D${sides}`}
              </Button>
            }>
            {SIDES.map((s) => (
              <Menu.Item key={s} title={`D${s}`} onPress={() => pickSides(s)} />
            ))}
          </Menu>
        </View>
        {result ? (
          <View style={styles.results}>
            <View style={styles.dice}>
              {result.map((v, i) => (
                <View
                  key={i}
                  style={[
                    styles.die,
                    {
                      borderColor: theme.prophecy.border,
                      backgroundColor: theme.colors.surfaceVariant,
                    },
                  ]}>
                  <Text style={[styles.dieText, { color: theme.colors.onSurface }]}>{v}</Text>
                </View>
              ))}
            </View>
            {result.length > 1 ? (
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                Total : {total}
              </Text>
            ) : null}
          </View>
        ) : null}
      </DsDialog>
    </>
  );
}

const styles = StyleSheet.create({
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countField: { flexGrow: 1, flexBasis: 120 },
  // Chevron trailing the "D10" label instead of leading it.
  sidesAnchorContent: { flexDirection: 'row-reverse' },
  results: { alignItems: 'center', gap: 10 },
  dice: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  die: {
    minWidth: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  dieText: { fontFamily: 'Cinzel_600SemiBold', fontSize: 18 },
});
