import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import { TendanceDiceRow } from '@/components/tendance-die';
import AppFab from '@/components/ui/app-fab';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { rollDice, rollTendances, type TendanceRoll } from '@/lib/dice';

/**
 * Global free-form dice roller — a FAB + dialog to roll any XdY, independent of
 * any character stat (initiative has its own roll on the weapons tab). Prophecy
 * is D10-heavy, so the die picker defaults to 10 and remembers the last die
 * across opens. That memory is a module-level var, not persisted: it survives
 * reopening/navigation within a session but not an app restart — matching the
 * "no roll history" decision.
 *
 * Alongside it sits the tendance roll — one D10 per tendance, the rulebook's
 * "roll all three, keep the one that suits your action". A separate result, not
 * a preset of the XdY roller: the two never show at once, and « Tendances » sits
 * next to « Lancer » on the right of the actions row because both are things the
 * dialog DOES, unlike « Fermer ».
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
  const [tendances, setTendances] = useState<TendanceRoll[] | null>(null);

  // The two rolls own the same result area, so each one clears the other.
  const clearResults = () => {
    setResult(null);
    setTendances(null);
  };
  const pickSides = (s: number) => {
    rememberSides(s);
    setSides(s);
    clearResults();
    setSidesMenu(false);
  };
  const setCountSafe = (t: string) => {
    setCount(Math.max(1, parseInt(t, 10) || 1));
    clearResults();
  };
  const roll = () => {
    setTendances(null);
    setResult(rollDice(count, sides));
  };
  const rollTendance = () => {
    setResult(null);
    setTendances(rollTendances());
  };

  const total = result ? result.reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <AppFab icon={dsIcon('dice')} onPress={() => setOpen(true)} />
      <DsDialog
        visible={open}
        onDismiss={() => setOpen(false)}
        title="Lancer les dés"
        dismiss={<Button onPress={() => setOpen(false)}>Fermer</Button>}
        actions={
          <>
            <Button mode="outlined" icon={dsIcon('dragon')} onPress={rollTendance}>
              Tendances
            </Button>
            <Button mode="contained" icon={dsIcon('dice')} onPress={roll}>
              Lancer
            </Button>
          </>
        }>
        <View style={styles.countRow}>
          <NumberField
            fieldKey="count"
            value={String(count)}
            onChange={(_, t) => setCountSafe(t)}
            maxLength={2}
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
        {tendances ? <TendanceDiceRow rolls={tendances} /> : null}
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
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  // Two digits wide — a dice count is never more, and the width freed here is
  // what lets « 2 × D10 » read as one centred phrase instead of a stretched form.
  countField: { flexGrow: 0, flexBasis: 'auto', width: 56, minWidth: 0 },
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
