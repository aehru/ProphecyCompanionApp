import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IconButton, Text } from 'react-native-paper';

import CharacterForm from '@/components/character-form';
import ConditionsCard from '@/components/conditions-card';
import EffectsCard from '@/components/effects-card';
import ArmorSection from '@/components/fiche/armor-section';
import HealthSection from '@/components/fiche/health-section';
import ResourcesSection from '@/components/fiche/resources-section';
import ShieldSection from '@/components/fiche/shield-section';
import StatGrid from '@/components/fiche/stat-grid';
import NumberField from '@/components/number-field';
import TendancesTriangle from '@/components/tendances-triangle';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import EditableSection from '@/components/ui/editable-section';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { ATTRIBUTS, CARACTERISTIQUES } from '@/constants/prophecy';
import type { ActualState, Character } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, clamp, num, txt } from '@/lib/character-values';
import { rollInitiative } from '@/lib/dice';
import { totalModifier, woundMalus } from '@/lib/modifiers';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery } from '@/repositories/armor';
import { deleteCharacter, updateCharacter } from '@/repositories/characters';
import { createEffect, effectsQuery } from '@/repositories/effects';
import { shieldsQuery } from '@/repositories/shields';
import { skillsQuery } from '@/repositories/skills';

// Caractéristique tiles are labelled by their abbreviation, not their full name.
// Built once at module load: the catalogue is static.
const CARAC_TILES = CARACTERISTIQUES.map((c) => ({ key: c.key, label: c.abbr }));

/**
 * The full character sheet ("Fiche") — every stat, editable. The dashboard
 * (index) is the glanceable read-only landing; all detailed view + edit lives
 * here. The tab-level FAB flips cards between read and edit; the header pencil
 * opens the full creation/identity form.
 */
export default function CharacterFicheScreen() {
  const numId = useCharacterId();
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  // ensure: live in-play edits write current values to actual_state.
  const { char, state, setChar, setState, reload } = useCharacterState(numId, {
    ensure: true,
    reloadOnFocus: true,
  });
  const { data: armors } = useLiveQuery(armorQuery(numId), [numId]);
  const { data: shieldRows } = useLiveQuery(shieldsQuery(numId), [numId]);
  const { data: effects } = useLiveQuery(effectsQuery(numId), [numId]);
  const { data: skills } = useLiveQuery(skillsQuery(numId), [numId]);
  // Tab-level live edit: one FAB flips every card between read and edit.
  const [editing, setEditing] = useEditToggle(navigation);
  // The header pencil opens the full sheet form (identity + maximums).
  const [editingSheet, setEditingSheet] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        editingSheet ? (
          <IconButton icon={dsIcon('close')} onPress={() => setEditingSheet(false)} />
        ) : (
          <IconButton icon={dsIcon('edit')} onPress={() => setEditingSheet(true)} />
        ),
    });
  }, [navigation, char?.nom, editingSheet]);

  // Leaving the tab also closes the full sheet form (the hook handles `editing`).
  useEffect(
    () => navigation.addListener('blur', () => setEditingSheet(false)),
    [navigation],
  );

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);
  const equippedArmor = (armors ?? []).find((a) => a.equipped) ?? null;
  const equippedShield = (shieldRows ?? []).find((s) => s.equipped) ?? null;
  const effectList = effects ?? [];
  // Wound malus hits every roll; folded into each stat's badge alongside effects.
  const wound = woundMalus(stRec);
  const initiativeMax = rec.initiativeMax ?? 0;
  const initStored = state?.initiativeValues ?? [];

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

  const setInit = (i: number, n: number) => {
    const next = Array.from({ length: initiativeMax }, (_, j) => (j === i ? n : initStored[j] ?? 0));
    setState((p) => (p ? ({ ...p, initiativeValues: next } as ActualState) : p));
    updateActualState(numId, { initiativeValues: next });
  };

  // Roll all initiative dice at once: initiativeMax plain D10, stored descending.
  const rollInit = () => {
    const next = rollInitiative(initiativeMax);
    setState((p) => (p ? ({ ...p, initiativeValues: next } as ActualState) : p));
    updateActualState(numId, { initiativeValues: next });
  };

  // New effect starts as a blank +0 on every roll; the editor screen fills it in.
  const addEffect = async () => {
    const row = await createEffect(numId, {
      target: 'all',
      value: 0,
      durationUnit: 'round',
      durationRemaining: 1,
    });
    router.push(`/character/${numId}/effect/${row.id}`);
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
          // Straight back to the character list — back() would land on whatever
          // screen came before (possibly another page of the deleted character).
          router.dismissTo('/');
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
        <SectionCard title="TENDANCES" icon="dragon" helper={editing ? "Appui +1, maintient -1" : undefined}>
          <TendancesTriangle
            get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })}
            onValue={
              editing ? (k, delta) => setCharValue(k, clamp((rec[k] ?? 0) + delta, 0)) : undefined
            }
            onSub={editing ? (k, n) => setCharValue(`${k}Sub`, n) : undefined}
          />
        </SectionCard>

        <StatGrid
          title="ATTRIBUTS"
          icon="rune"
          stats={ATTRIBUTS}
          valueOf={(k) => num(rec[k])}
          modifierOf={(k) => totalModifier(k, effectList, wound)}
        />

        <StatGrid
          title="CARACTÉRISTIQUES"
          icon="star"
          stats={CARAC_TILES}
          valueOf={(k) => num(rec[k])}
          modifierOf={(k) => totalModifier(k, effectList, wound)}
        />

        <EditableSection
          title="INITIATIVE"
          action={() =>
            initiativeMax > 0 ? (
              <IconButton
                icon={dsIcon('dice')}
                size={18}
                onPress={rollInit}
                accessibilityLabel="Lancer l’initiative"
                style={styles.initRoll}
              />
            ) : null
          }>
          {(initEditing) => {
            if (initiativeMax <= 0) {
              return (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Définis l’initiative (max) avec le crayon en haut.
                </Text>
              );
            }
            const vals = Array.from({ length: initiativeMax }, (_, i) => initStored[i] ?? 0);
            return (
              <View style={styles.initGrid}>
                {vals.map((val, i) => {
                  if (initEditing) {
                    return (
                      <NumberField
                        key={i}
                        fieldKey={String(i)}
                        label={`Dé ${i + 1}`}
                        value={String(val)}
                        onChange={(k, t) => setInit(Number(k), parseInt(t, 10) || 0)}
                        style={styles.initField}
                      />
                    );
                  }
                  // Wound malus applies to initiative like any roll. A rolled die
                  // driven to 0 or below is unusable → error border.
                  const unusable = val > 0 && val + wound <= 0;
                  return (
                    <StatChip
                      key={i}
                      label={`Dé ${i + 1}`}
                      value={String(val)}
                      modifier={wound}
                      style={
                        unusable
                          ? { borderColor: theme.colors.error, borderWidth: 1.5 }
                          : undefined
                      }
                    />
                  );
                })}
              </View>
            );
          }}
        </EditableSection>

        <HealthSection
          maxOf={(k) => rec[k] ?? 0}
          currentOf={(k) => stRec[k] ?? 0}
          onSet={setStateValue}
          editing={editing}
        />

        <EffectsCard effects={effectList} skills={skills ?? []} editing={editing} />

        {equippedArmor ? <ArmorSection armor={equippedArmor} editing={editing} /> : null}
        {equippedShield ? <ShieldSection shield={equippedShield} editing={editing} /> : null}

        <ResourcesSection
          currentOf={(k) => stRec[k] ?? 0}
          maxOf={(k) => rec[k] ?? 0}
          adjust={adjustRes}
          onRefill={(k) => setStateValue(`${k}Current`, rec[`${k}Max`] ?? 0)}
          editing={editing}
        />

        {state ? (
          <ConditionsCard state={state} editing={editing} onPersist={persistState} />
        ) : null}

        <SectionCard title="BIOGRAPHIE" icon="scroll">
          <Text>{txt(char.biographie)}</Text>
        </SectionCard>
      </KeyboardAwareScrollView>

      <AppFab icon="fire" onPress={addEffect} offset={72} />
      <AppFab
        icon={editing ? dsIcon('check') : dsIcon('edit')}
        onPress={() => setEditing((e) => !e)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 160 },
  initRoll: { margin: 0 },
  initGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  initField: { flexGrow: 0, flexBasis: 72, minWidth: 72 },
});
