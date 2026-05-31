import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';

import Bullets from '@/components/bullets';
import TendancesTriangle from '@/components/tendances-triangle';
import { RESOURCES, WOUND_LEVELS } from '@/constants/prophecy';
import type { ActualState, Character } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { ensureActualState, updateActualState } from '@/repositories/actual-state';
import { getCharacter, updateCharacter } from '@/repositories/characters';

export default function StatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const theme = useProphecyTheme();
  const [char, setChar] = useState<Character | null | undefined>(undefined);
  const [st, setSt] = useState<ActualState | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const c = await getCharacter(numId);
      const s = await ensureActualState(numId);
      if (active) {
        setChar(c);
        setSt(s);
      }
    })();
    return () => {
      active = false;
    };
  }, [numId]);

  if (char === undefined || !st) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  if (char === null) {
    return (
      <View style={styles.centered}>
        <Text>Personnage introuvable.</Text>
      </View>
    );
  }

  const charRec = asNumRecord(char);
  const stRec = asNumRecord(st);

  function persist(patch: Partial<ActualState>) {
    setSt((prev) => (prev ? ({ ...prev, ...patch } as ActualState) : prev));
    updateActualState(numId, patch);
  }

  // Tendance value + puces live on the character; edits here persist to it.
  function persistChar(patch: Partial<Character>) {
    setChar((prev) => (prev ? ({ ...prev, ...patch } as Character) : prev));
    updateCharacter(numId, patch);
  }

  function setLevel(key: string, n: number) {
    persist({ [`${key}Current`]: n } as Partial<ActualState>);
  }

  function adjust(key: string, delta: number) {
    const max = charRec[`${key}Max`] ?? 0;
    let next = (stRec[`${key}Current`] ?? 0) + delta;
    if (next < 0) next = 0;
    if (max > 0 && next > max) next = max;
    persist({ [`${key}Current`]: next } as Partial<ActualState>);
  }

  function resetWounds() {
    persist({
      egratinureCurrent: 0,
      legereCurrent: 0,
      graveCurrent: 0,
      fataleCurrent: 0,
      mortCurrent: 0,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Statut' }} />
      <Text variant="titleLarge">{char.nom || 'Sans nom'}</Text>

      <Text variant="titleMedium" style={styles.section}>
        Tendances
      </Text>
      <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Valeur : appui +1, appui long −1
      </Text>
      <TendancesTriangle
        get={(k) => ({ value: charRec[k] ?? 0, sub: charRec[`${k}Sub`] ?? 0 })}
        onValue={(k, delta) =>
          persistChar({ [k]: Math.max(0, (charRec[k] ?? 0) + delta) } as Partial<Character>)
        }
        onSub={(k, n) => persistChar({ [`${k}Sub`]: n } as Partial<Character>)}
      />

      <Text variant="titleMedium" style={styles.section}>
        Santé
      </Text>
      {WOUND_LEVELS.map((w) => {
        const cur = stRec[`${w.key}Current`] ?? 0;
        const max = charRec[`${w.key}Max`] ?? 0;
        return (
          <View key={w.key} style={styles.woundBlock}>
            <View style={styles.woundHead}>
              <Text style={styles.woundLabel}>{w.label}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {cur} / {max}
              </Text>
            </View>
            <Bullets
              count={max}
              filled={cur}
              onSet={(n) => setLevel(w.key, n)}
              color={theme.colors.error}
            />
            <Divider style={styles.divider} />
          </View>
        );
      })}

      <Button mode="outlined" onPress={resetWounds} style={styles.section}>
        Réinitialiser les blessures
      </Button>

      <Text variant="titleMedium" style={styles.section}>
        Ressources
      </Text>
      {RESOURCES.map((r) => {
        const cur = stRec[`${r.key}Current`] ?? 0;
        const max = charRec[`${r.key}Max`] ?? 0;
        return (
          <View key={r.key}>
            <View style={styles.resourceRow}>
              <Text style={styles.woundLabel}>{r.label}</Text>
              <IconButton
                icon="minus"
                mode="contained"
                size={18}
                disabled={cur <= 0}
                onPress={() => adjust(r.key, -1)}
              />
              <Text style={styles.resourceCount}>
                {cur} / {max}
              </Text>
              <IconButton
                icon="plus"
                mode="contained"
                size={18}
                disabled={max > 0 && cur >= max}
                onPress={() => adjust(r.key, 1)}
              />
              <IconButton
                icon="refresh"
                size={18}
                onPress={() => persist({ [`${r.key}Current`]: max } as Partial<ActualState>)}
              />
            </View>
            <Divider />
          </View>
        );
      })}

      <TextInput
        label="États / conditions"
        value={st.conditions}
        onChangeText={(t) => persist({ conditions: t })}
        mode="outlined"
        multiline
        style={styles.section}
      />
      <TextInput
        label="Notes"
        value={st.notes}
        onChangeText={(t) => persist({ notes: t })}
        mode="outlined"
        multiline
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 8 },
  hint: { fontSize: 12, marginTop: -4 },
  woundBlock: { gap: 6 },
  woundHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  woundLabel: { flex: 1, fontSize: 16 },
  divider: { marginTop: 6 },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resourceCount: { minWidth: 56, textAlign: 'center', fontSize: 16 },
});
