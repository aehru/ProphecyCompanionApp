import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import ConditionsCard from '@/components/conditions-card';
import EffectsCard from '@/components/effects-card';
import HealthSection from '@/components/fiche/health-section';
import InitiativeSection from '@/components/fiche/initiative-section';
import ResourcesSection from '@/components/fiche/resources-section';
import type { ActualState } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, clamp } from '@/lib/character-values';
import { initiativeDiceCount, rollInitiativeWithIcons, trimInitiativeSlots } from '@/lib/dice';
import { woundMalus } from '@/lib/modifiers';
import { actualStateQuery, updateActualState } from '@/repositories/actual-state';
import { characterByUuidQuery } from '@/repositories/characters';
import { effectsQuery } from '@/repositories/effects';
import { skillsQuery } from '@/repositories/skills';

/**
 * The GM editing one of their own NPCs from the table roster, in place.
 *
 * A roster card renders the *projection* — read-only and stripped — so editing
 * has to go back to the local row. `entry.charId` is the portable uuid, the
 * roster's only handle on a character; everything here hangs off that lookup.
 *
 * Scope is deliberately the in-play values (`actual_state`): what actually
 * moves during a fight. The full sheet stays on the character's Fiche.
 *
 * Writes land straight in the DB — `useLiveQuery` re-renders this on its own,
 * so there's no optimistic local copy to keep in sync (unlike the Fiche, which
 * mirrors state to keep long-press repeat smooth). The broadcast follows for
 * free: touching `actual_state` moves the projection signature, so a live
 * campaign pushes it on the usual debounce and a paused one syncs on resume.
 */
export default function NpcInPlayEditor({ charUuid }: { charUuid: string }) {
  const theme = useProphecyTheme();
  // `updatedAt` is undefined until a query has actually run. useLiveQuery seeds
  // `data` with [] and fetches in an effect, so without this an empty result is
  // indistinguishable from "not loaded yet" — and the not-found message below
  // would flash on every open.
  const { data: charRows, updatedAt: charLoaded } = useLiveQuery(
    characterByUuidQuery(charUuid),
    [charUuid],
  );
  const char = charRows?.[0] ?? null;
  // 0 matches nothing — keeps the hook order stable while the character loads.
  const localId = char?.id ?? 0;
  const { data: stateRows, updatedAt: stateLoaded } = useLiveQuery(actualStateQuery(localId), [
    localId,
  ]);
  const { data: effects } = useLiveQuery(effectsQuery(localId), [localId]);
  const { data: skills } = useLiveQuery(skillsQuery(localId), [localId]);
  const state = stateRows?.[0] ?? null;

  if (!charLoaded || (char && !stateLoaded)) {
    return <ActivityIndicator style={styles.loading} />;
  }

  // The PNJ is shared from another device: the projection is all we have.
  if (!char || !state) {
    return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Ce personnage n’existe pas sur cet appareil — modification impossible.
      </Text>
    );
  }

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);
  const initMax = rec.initiativeMax ?? 0;
  const initBonus = stRec.initiativeBonusDice ?? 0;
  const initCount = initiativeDiceCount(initMax, initBonus);
  const initStored = state.initiativeValues ?? [];
  const initIcons = state.initiativeDiceIcons ?? [];

  const setStateValue = (key: string, value: number) =>
    updateActualState(localId, { [key]: value } as Partial<ActualState>);
  const persistState = (patch: Partial<ActualState>) => updateActualState(localId, patch);
  const adjustRes = (key: string, delta: number) =>
    setStateValue(
      `${key}Current`,
      clamp((stRec[`${key}Current`] ?? 0) + delta, 0, rec[`${key}Max`] ?? 0),
    );
  const setInit = (i: number, n: number) =>
    persistState({
      initiativeValues: Array.from({ length: initCount }, (_, j) =>
        j === i ? n : initStored[j] ?? 0,
      ),
    });
  const setInitIcon = (i: number, icon: string) =>
    persistState({
      initiativeDiceIcons: Array.from({ length: initCount }, (_, j) =>
        j === i ? icon : initIcons[j] ?? '',
      ),
    });

  return (
    <View style={styles.root}>
      <InitiativeSection
        max={initMax}
        bonus={initBonus}
        values={initStored}
        icons={initIcons}
        wound={woundMalus(stRec)}
        onSetDie={setInit}
        onSetIcon={setInitIcon}
        onSetBonus={(n) => {
          // Dropping a die drops its stored roll and its mark — see the Fiche.
          const next = initiativeDiceCount(initMax, n);
          persistState({
            initiativeBonusDice: n,
            initiativeValues: trimInitiativeSlots(initStored, next),
            initiativeDiceIcons: trimInitiativeSlots(initIcons, next),
          });
        }}
        onRoll={() => {
          const { values, icons } = rollInitiativeWithIcons(initCount, initIcons);
          persistState({ initiativeValues: values, initiativeDiceIcons: icons });
        }}
      />
      <HealthSection
        maxOf={(k) => rec[k] ?? 0}
        currentOf={(k) => stRec[k] ?? 0}
        onSet={setStateValue}
        editing
      />
      <ResourcesSection
        currentOf={(k) => stRec[k] ?? 0}
        maxOf={(k) => rec[k] ?? 0}
        adjust={adjustRes}
        onRefill={(k) => setStateValue(`${k}Current`, rec[`${k}Max`] ?? 0)}
        editing
      />
      <ConditionsCard state={state} editing onPersist={persistState} />
      <EffectsCard effects={effects ?? []} skills={skills ?? []} editing />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 18 },
  loading: { paddingVertical: 24 },
});
