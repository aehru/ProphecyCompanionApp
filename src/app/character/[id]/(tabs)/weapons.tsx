import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import ArmorEditor from '@/components/armor-editor';
import NumberField from '@/components/number-field';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import EditableSection from '@/components/ui/editable-section';
import WeaponCard from '@/components/weapon-card';
import type { ActualState } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { updateActualState } from '@/repositories/actual-state';
import { createWeapon, weaponsQuery } from '@/repositories/weapons';

export default function CharacterWeaponsScreen() {
  const numId = useCharacterId();
  const theme = useProphecyTheme();
  // ensure: initiative current-turn values live on actual_state, edited here.
  const { char, state, setState } = useCharacterState(numId, { ensure: true, reloadOnFocus: true });
  const { data: weapons } = useLiveQuery(weaponsQuery(numId));

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const list = weapons ?? [];
  const initiativeMax = rec.initiativeMax ?? 0;
  const initStored = state?.initiativeValues ?? [];

  const setInit = (i: number, n: number) => {
    const next = Array.from({ length: initiativeMax }, (_, j) => (j === i ? n : initStored[j] ?? 0));
    setState((p) => (p ? ({ ...p, initiativeValues: next } as ActualState) : p));
    updateActualState(numId, { initiativeValues: next });
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
        <EditableSection title="INITIATIVE">
          {(editing) => {
            if (initiativeMax <= 0) {
              return (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Définis l’initiative (max) dans la fiche.
                </Text>
              );
            }
            const vals = Array.from({ length: initiativeMax }, (_, i) => initStored[i] ?? 0);
            return (
              <View style={styles.initGrid}>
                {vals.map((val, i) =>
                  editing ? (
                    <NumberField
                      key={i}
                      fieldKey={String(i)}
                      label={`Dé ${i + 1}`}
                      value={String(val)}
                      onChange={(k, t) => setInit(Number(k), parseInt(t, 10) || 0)}
                      style={styles.initField}
                    />
                  ) : (
                    <View key={i} style={[styles.initChip, { borderColor: theme.colors.outlineVariant }]}>
                      <Text style={[styles.initChipLabel, { color: theme.colors.onSurfaceVariant }]}>
                        Dé {i + 1}
                      </Text>
                      <Text variant="titleMedium">{val}</Text>
                    </View>
                  ),
                )}
              </View>
            );
          }}
        </EditableSection>

        {list.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Aucune arme. Ajoutez-en une avec le bouton +.
          </Text>
        ) : (
          list.map((w) => <WeaponCard key={w.id} weapon={w} caracValue={(k) => rec[k] ?? 0} />)
        )}

        <ArmorEditor characterId={numId} />
      </KeyboardAwareScrollView>
      <AppFab icon="plus" label="Arme" onPress={() => createWeapon(numId)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 96 },
  initGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  initField: { flexGrow: 0, flexBasis: 72, minWidth: 72 },
  initChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  initChipLabel: { fontSize: 11, letterSpacing: 0.5 },
});
