import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput as RNTextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IconButton, Text } from 'react-native-paper';

import Bullets from '@/components/bullets';
import CharacterForm from '@/components/character-form';
import ConditionsCard from '@/components/conditions-card';
import EffectsCard from '@/components/effects-card';
import NumberField from '@/components/number-field';
import TendancesTriangle from '@/components/tendances-triangle';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { ATTRIBUTS, CARACTERISTIQUES, MONEY, RESOURCES, WOUND_LEVELS } from '@/constants/prophecy';
import type { ActualState, Character } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, clamp, num, txt } from '@/lib/character-values';
import { totalModifier, woundMalus } from '@/lib/modifiers';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery, updateArmor } from '@/repositories/armor';
import { deleteCharacter, updateCharacter } from '@/repositories/characters';
import { effectsQuery } from '@/repositories/effects';

// Order the editable numeric fields chain through with the keyboard "next" key.
const EDIT_ORDER: readonly string[] = [
  ...ATTRIBUTS.map((a) => a.key),
  ...CARACTERISTIQUES.map((c) => c.key),
  ...MONEY.map((m) => m.key),
];

export default function CharacterResumeScreen() {
  const numId = useCharacterId();
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  // ensure: live in-play edits write current values to actual_state.
  const { char, state, setChar, setState, reload } = useCharacterState(numId, {
    ensure: true,
    reloadOnFocus: true,
  });
  const { data: armors } = useLiveQuery(armorQuery(numId));
  const { data: effects } = useLiveQuery(effectsQuery(numId));
  // Tab-level live edit: one FAB flips every card between read and edit.
  const [editing, setEditing] = useEditToggle(navigation);
  // The header pencil opens the full sheet form (identity + maximums).
  const [editingSheet, setEditingSheet] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: char?.nom || 'Personnage',
      headerRight: () =>
        editingSheet ? (
          <IconButton icon="close" onPress={() => setEditingSheet(false)} />
        ) : (
          <IconButton icon="pencil" onPress={() => setEditingSheet(true)} />
        ),
    });
  }, [navigation, char?.nom, editingSheet]);

  // Leaving the tab also closes the full sheet form (the hook handles `editing`).
  useEffect(
    () => navigation.addListener('blur', () => setEditingSheet(false)),
    [navigation],
  );

  // Keyboard "next" wiring: jump to the following editable field on return.
  const fieldRefs = useRef<Record<string, RNTextInput | null>>({});

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);
  const equippedArmor = (armors ?? []).find((a) => a.equipped) ?? null;
  const effectList = effects ?? [];
  // Wound malus hits every roll; folded into each stat's badge alongside effects.
  const wound = woundMalus(stRec);

  // Live writers: update local state immediately, persist in the background.
  const setCharValue = (key: string, value: number) => {
    setChar((p) => (p ? ({ ...p, [key]: value } as Character) : p));
    updateCharacter(numId, { [key]: value } as Partial<Character>);
  };
  const setStateValue = (key: string, value: number) => {
    setState((p) => (p ? ({ ...p, [key]: value } as ActualState) : p));
    updateActualState(numId, { [key]: value } as Partial<ActualState>);
  };
  const persistState = (patch: Partial<ActualState>) => {
    setState((p) => (p ? ({ ...p, ...patch } as ActualState) : p));
    updateActualState(numId, patch);
  };
  const adjustRes = (key: string, delta: number) =>
    setStateValue(
      `${key}Current`,
      clamp((stRec[`${key}Current`] ?? 0) + delta, 0, rec[`${key}Max`] ?? 0),
    );

  const chain = (key: string) => {
    const i = EDIT_ORDER.indexOf(key);
    const isLast = i === EDIT_ORDER.length - 1;
    return {
      inputRef: (el: RNTextInput | null) => {
        fieldRefs.current[key] = el;
      },
      returnKeyType: (isLast ? 'done' : 'next') as 'done' | 'next',
      submitBehavior: (isLast ? 'blurAndSubmit' : 'submit') as 'blurAndSubmit' | 'submit',
      onSubmitEditing: () => fieldRefs.current[EDIT_ORDER[i + 1]]?.focus(),
    };
  };

  if (editingSheet) {
    return (
      <CharacterForm
        initial={char}
        submitLabel="Enregistrer"
        onSubmit={async (data) => {
          await updateCharacter(numId, data);
          reload();
          setEditingSheet(false);
        }}
        onDelete={async () => {
          await deleteCharacter(numId);
          router.back();
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
        <SectionCard title="TENDANCES" helper={editing ? "Appui +1, maintient -1" : undefined}>
          <TendancesTriangle
            get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })}
            onValue={
              editing ? (k, delta) => setCharValue(k, clamp((rec[k] ?? 0) + delta, 0)) : undefined
            }
            onSub={editing ? (k, n) => setCharValue(`${k}Sub`, n) : undefined}
          />
        </SectionCard>

        <SectionCard title="ATTRIBUTS">
          <View style={styles.grid}>
            {ATTRIBUTS.map((a) => (
                <StatChip
                  key={a.key}
                  label={a.label}
                  value={num(rec[a.key])}
                  modifier={totalModifier(a.key, effectList, wound)}
                  style={styles.col4}
                />
              ),
            )}
          </View>
        </SectionCard>

        <SectionCard title="CARACTÉRISTIQUES">
          <View style={styles.grid}>
            {CARACTERISTIQUES.map((c) => (
                <StatChip
                  key={c.key}
                  label={c.abbr}
                  value={num(rec[c.key])}
                  modifier={totalModifier(c.key, effectList, wound)}
                  style={styles.col4}
                />
              ),
            )}
          </View>
        </SectionCard>

        <SectionCard title="SANTÉ">
          {WOUND_LEVELS.map((w) => (
            <View key={w.key} style={styles.woundRow}>
              <View style={styles.woundInfo}>
                <Text style={styles.woundLabel}>{w.label}</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{w.damage}</Text>
              </View>
              <View style={styles.woundBullets}>
                <Bullets
                  count={rec[`${w.key}Max`] ?? 0}
                  filled={stRec[`${w.key}Current`] ?? 0}
                  color={editing ? theme.colors.error : theme.colors.onSurfaceVariant}
                  size={14}
                  gap={4}
                  perRow={5}
                  onSet={editing ? (n) => setStateValue(`${w.key}Current`, n) : undefined}
                />
              </View>
              <Text style={[styles.woundMalus, { color: theme.colors.onSurfaceVariant }]}>
                {w.malus ?? ''}
              </Text>
            </View>
          ))}
        </SectionCard>

        <EffectsCard characterId={numId} effects={effectList} editing={editing} />

        {equippedArmor ? (
          <SectionCard title="ARMURE">
            <View style={styles.healthRow}>
              <Text style={[styles.healthLabel, { color: theme.colors.onSurfaceVariant }]}>
                {equippedArmor.name || 'Armure'}
              </Text>
              <Bullets
                count={equippedArmor.defenseMax}
                filled={equippedArmor.defenseCurrent}
                color={editing ? theme.colors.primary : theme.colors.onSurfaceVariant}
                size={14}
                gap={4}
                perRow={5}
                style={styles.healthDots}
                onSet={
                  editing ? (n) => updateArmor(equippedArmor.id, { defenseCurrent: n }) : undefined
                }
              />
            </View>
          </SectionCard>
        ) : null}

        <SectionCard title="RESSOURCES">
          {RESOURCES.map((r) => {
            const cur = stRec[`${r.key}Current`] ?? 0;
            const max = rec[`${r.key}Max`] ?? 0;
            return (
              <View key={r.key} style={styles.resRow}>
                <Text style={styles.resLabel}>{r.label}</Text>
                {editing ? (
                  <IconButton
                    icon="minus"
                    mode="contained"
                    size={16}
                    disabled={cur <= 0}
                    onPress={() => adjustRes(r.key, -1)}
                  />
                ) : null}
                <Text style={styles.resCount}>
                  {cur} / {max}
                </Text>
                {editing ? (
                  <>
                    <IconButton
                      icon="plus"
                      mode="contained"
                      size={16}
                      disabled={max > 0 && cur >= max}
                      onPress={() => adjustRes(r.key, 1)}
                    />
                    <IconButton
                      icon="refresh"
                      size={16}
                      onPress={() => setStateValue(`${r.key}Current`, max)}
                    />
                  </>
                ) : null}
              </View>
            );
          })}
        </SectionCard>

        <SectionCard title="ARGENT">
          <View style={styles.grid}>
            {MONEY.map((m) =>
              editing ? (
                <NumberField
                  key={m.key}
                  fieldKey={m.key}
                  label={m.abbr}
                  value={String(stRec[m.key] ?? 0)}
                  onChange={(k, t) => setStateValue(k, Number(t) || 0)}
                  style={styles.coin}
                  {...chain(m.key)}
                />
              ) : (
                <StatChip key={m.key} label={m.abbr} value={String(stRec[m.key] ?? 0)} style={styles.coin} />
              ),
            )}
          </View>
        </SectionCard>

        {state ? (
          <ConditionsCard state={state} editing={editing} onPersist={persistState} />
        ) : null}

        <SectionCard title="BIOGRAPHIE">
          <Text>{txt(char.biographie)}</Text>
        </SectionCard>
      </KeyboardAwareScrollView>

      <AppFab
        icon={editing ? 'check' : 'pencil'}
        onPress={() => setEditing((e) => !e)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 96 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Grow to fill each row so tiles sit flush to both card edges (no trailing
  // gap on the right). flexBasis keeps the wrap at 4 columns.
  col4: { flexGrow: 1, flexBasis: '22%', minWidth: 0 },
  coin: { flexGrow: 1, flexBasis: 64, minWidth: 64 },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  healthLabel: { fontSize: 15 },
  healthDots: { flexShrink: 1, justifyContent: 'flex-end' },
  woundRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  woundInfo: { width: 90 },
  woundBullets: { flex: 1, alignItems: 'flex-end' },
  woundLabel: { fontSize: 16 },
  woundMalus: { width: 32, textAlign: 'right', fontSize: 16 },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resLabel: { flex: 1, fontSize: 16 },
  resCount: { minWidth: 56, textAlign: 'center', fontSize: 16 },
});
