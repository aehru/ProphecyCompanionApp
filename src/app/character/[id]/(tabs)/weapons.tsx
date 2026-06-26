import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import ArmorCard from '@/components/armor-card';
import NumberField from '@/components/number-field';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import EditableSection from '@/components/ui/editable-section';
import StatChip from '@/components/ui/stat-chip';
import WeaponCard from '@/components/weapon-card';
import type { ActualState } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery, createArmor } from '@/repositories/armor';
import { createWeapon, weaponsQuery } from '@/repositories/weapons';

export default function CharacterWeaponsScreen() {
  const numId = useCharacterId();
  const theme = useProphecyTheme();
  // ensure: initiative current-turn values live on actual_state, edited here.
  const { char, state, setState } = useCharacterState(numId, { ensure: true, reloadOnFocus: true });
  const { data: weapons } = useLiveQuery(weaponsQuery(numId));
  const { data: armors } = useLiveQuery(armorQuery(numId));

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const list = weapons ?? [];
  const armorList = armors ?? [];
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
                    <StatChip key={i} label={`Dé ${i + 1}`} value={String(val)} />
                  ),
                )}
              </View>
            );
          }}
        </EditableSection>

        <Text style={[styles.heading, { color: theme.colors.primary }]}>ARMES</Text>
        {list.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Aucune arme. Ajoutez-en une avec le bouton « Arme ».
          </Text>
        ) : (
          list.map((w) => <WeaponCard key={w.id} weapon={w} caracValue={(k) => rec[k] ?? 0} />)
        )}

        <Text style={[styles.heading, { color: theme.colors.primary }]}>ARMURES</Text>
        {armorList.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Aucune armure. Ajoutez-en une avec le bouton « Armure ».
          </Text>
        ) : (
          armorList.map((a) => <ArmorCard key={a.id} armor={a} />)
        )}
      </KeyboardAwareScrollView>
      <AppFab
        icon="shield-plus"
        onPress={() => createArmor(numId)}
        style={styles.fabTop}
      />
      <AppFab icon="sword" onPress={() => createWeapon(numId)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 160 },
  // Second FAB sits above the bottom one.
  fabTop: { bottom: 88 },
  heading: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  initGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  initField: { flexGrow: 0, flexBasis: 72, minWidth: 72 },
});
