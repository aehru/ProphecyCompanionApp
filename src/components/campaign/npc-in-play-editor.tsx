import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import ConditionsCard from '@/components/conditions-card';
import EffectsCard from '@/components/effects-card';
import HealthSection from '@/components/fiche/health-section';
import InitiativeSection from '@/components/fiche/initiative-section';
import ResourcesSection from '@/components/fiche/resources-section';
import type { Character } from '@/db/schema';
import { useInPlayWriters } from '@/hooks/use-in-play-writers';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { woundMalus } from '@/lib/modifiers';
import { actualStateQuery } from '@/repositories/actual-state';
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
  // `updatedAt` is undefined until a query has actually run. useLiveQuery seeds
  // `data` with [] and fetches in an effect, so without this an empty result is
  // indistinguishable from "not loaded yet" — and the not-found message below
  // would flash on every open.
  const { data: charRows, updatedAt: charLoaded } = useLiveQuery(
    characterByUuidQuery(charUuid),
    [charUuid],
  );
  const char = charRows?.[0] ?? null;

  if (!charLoaded) return <ActivityIndicator style={styles.loading} />;
  // The PNJ is shared from another device: the projection is all we have.
  if (!char) return <NotOnThisDevice />;
  // The three state queries hang off the LOCAL id, so they mount only once the
  // uuid has resolved to one — running them against `id = 0` while it loads was
  // three round-trips that could never match. Hooks can't be conditional, hence
  // the split; the same one <NpcGearSections> makes.
  return <EditorBody char={char} />;
}

function NotOnThisDevice() {
  const theme = useProphecyTheme();
  return (
    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
      Ce personnage n’existe pas sur cet appareil — modification impossible.
    </Text>
  );
}

function EditorBody({ char }: { char: Character }) {
  const localId = char.id;
  const { data: stateRows, updatedAt: stateLoaded } = useLiveQuery(actualStateQuery(localId), [
    localId,
  ]);
  const { data: effects } = useLiveQuery(effectsQuery(localId), [localId]);
  const { data: skills } = useLiveQuery(skillsQuery(localId), [localId]);
  const state = stateRows?.[0] ?? null;
  // No `mirror`: this screen reads through useLiveQuery, so a local copy would
  // only fight the refresh. See the hook. Above the guards below, like the
  // queries it reads from — it tolerates a state row that has not loaded.
  const { setStateValue, persistState, adjustRes, refillRes, initiative } = useInPlayWriters({
    characterId: localId,
    char,
    state,
  });

  if (!stateLoaded) return <ActivityIndicator style={styles.loading} />;
  // A character row with no `actual_state` is the same dead end as one that
  // isn't here at all: there is nothing in play to edit.
  if (!state) return <NotOnThisDevice />;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);

  return (
    <View style={styles.root}>
      <InitiativeSection {...initiative} wound={woundMalus(stRec)} />
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
        onRefill={refillRes}
        editing
      />
      <ConditionsCard state={state} editing onPersist={persistState} />
      <EffectsCard characterId={localId} effects={effects ?? []} skills={skills ?? []} editing />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 18 },
  loading: { paddingVertical: 24 },
});
