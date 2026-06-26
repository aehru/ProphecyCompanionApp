import { useNavigation } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import Bullets from '@/components/bullets';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { DISCIPLINES, SPHERES } from '@/constants/prophecy';
import type { ActualState } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, num } from '@/lib/character-values';
import { updateActualState } from '@/repositories/actual-state';

/**
 * Magie tab — live in-play tracking only. Reserve and spheres are pools whose
 * max lives on the character (set in the sheet form's Magie tab); here the
 * current value is adjusted by tapping bullets, 5 per row. A sphere appears once
 * its max > 0. Disciplines are read-only stats (edited in the form).
 */
export default function CharacterMagicScreen() {
  const numId = useCharacterId();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  // ensure: current magic values live on actual_state, edited here.
  const { char, state, setState } = useCharacterState(numId, {
    ensure: true,
    reloadOnFocus: true,
  });
  const [editing, setEditing] = useEditToggle(navigation);

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);

  // Live writer: update local state immediately, persist in the background.
  const setStateValue = (key: string, value: number) => {
    setState((p) => (p ? ({ ...p, [key]: value } as ActualState) : p));
    updateActualState(numId, { [key]: value } as Partial<ActualState>);
  };

  const dotColor = editing ? theme.colors.primary : theme.colors.onSurfaceVariant;
  const reserveMax = rec.reserveMagiqueMax ?? 0;
  const reserveCur = stRec.reserveMagiqueCurrent ?? 0;
  const knownSpheres = SPHERES.filter((s) => (rec[`${s.key}Max`] ?? 0) > 0);

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
        <SectionCard title="DISCIPLINES">
          <View style={styles.grid}>
            {DISCIPLINES.map((d) => (
              <StatChip key={d.key} label={d.label} value={num(rec[d.key])} />
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="RÉSERVE">
          <View style={styles.sphereRow}>
            <Text style={styles.sphereLabel}>Globale</Text>
            <Bullets
              count={reserveMax}
              filled={reserveCur}
              perRow={5}
              color={dotColor}
              size={16}
              gap={6}
              onSet={editing ? (n) => setStateValue('reserveMagiqueCurrent', n) : undefined}
            />
          </View>

          {knownSpheres.map((s) => {
            const curKey = `${s.key}Current`;
            return (
              <View
                key={s.key}
                style={[
                  styles.sphereRow,
                  styles.sphereDivider,
                  { borderTopColor: theme.colors.outlineVariant },
                ]}>
                <Text style={styles.sphereLabel}>{s.label}</Text>
                <Bullets
                  count={rec[`${s.key}Max`] ?? 0}
                  filled={stRec[curKey] ?? 0}
                  perRow={5}
                  color={dotColor}
                  size={16}
                  gap={6}
                  onSet={editing ? (n) => setStateValue(curKey, n) : undefined}
                />
              </View>
            );
          })}
        </SectionCard>
      </KeyboardAwareScrollView>

      <AppFab icon={editing ? 'check' : 'pencil'} onPress={() => setEditing((e) => !e)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 96 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sphereRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sphereDivider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  sphereLabel: { width: 72, fontSize: 15, lineHeight: 16 },
});
