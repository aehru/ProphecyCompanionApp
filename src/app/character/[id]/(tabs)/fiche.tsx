import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IconButton, Text } from 'react-native-paper';

import CharacterForm from '@/components/character-form';
import ConditionsCard from '@/components/conditions-card';
import DiceRollerButton from '@/components/dice-roller-button';
import EffectsCard from '@/components/effects-card';
import ArmorSection from '@/components/fiche/armor-section';
import HealthSection from '@/components/fiche/health-section';
import InitiativeSection from '@/components/fiche/initiative-section';
import ResourcesSection from '@/components/fiche/resources-section';
import ShieldSection from '@/components/fiche/shield-section';
import StatGrid from '@/components/fiche/stat-grid';
import XpSection from '@/components/fiche/xp-section';
import GlobalModifierRow from '@/components/global-modifier-row';
import TendancesTriangle from '@/components/tendances-triangle';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import Columns from '@/components/ui/columns';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUTS, CARACTERISTIQUES } from '@/constants/prophecy';
import type { ActualState, Character } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { openRoller } from '@/lib/dice-roller';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { useSplitWidth } from '@/hooks/use-layout';
import { asNumRecord, clamp, num, txt } from '@/lib/character-values';
import { initiativeDiceCount, rollInitiativeWithIcons, trimInitiativeSlots } from '@/lib/dice';
import { globalModifier, statModifier, woundMalus } from '@/lib/modifiers';
import { statRollContext } from '@/lib/roll-context';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery } from '@/repositories/armor';
import { deleteCharacter, updateCharacter } from '@/repositories/characters';
import { effectsQuery } from '@/repositories/effects';
import { shieldsQuery } from '@/repositories/shields';
import { skillsQuery } from '@/repositories/skills';

// Caractéristique tiles are labelled by their abbreviation, not their full name.
// Built once at module load: the catalogue is static.
const CARAC_TILES = CARACTERISTIQUES.map((c) => ({ key: c.key, label: c.abbr }));

// Both catalogues by column key, for the roller: the dialog titles a roll with
// the full name the tile has no room for (« Volonté », not « VOL »), and keeps
// the abbreviation for the sum. Attributs have no short form and use neither.
const STAT_LABELS: Record<string, { label: string; abbr?: string }> = {
  ...Object.fromEntries(CARACTERISTIQUES.map((c) => [c.key, { label: c.label, abbr: c.abbr }])),
  ...Object.fromEntries(ATTRIBUTS.map((a) => [a.key, { label: a.label }])),
};

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
  const splitWidth = useSplitWidth();

  // This replaces the tabs layout's headerRight wholesale, so the dice button
  // it puts on every other tab has to be re-added here, left of the pencil.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <DiceRollerButton />
          {editingSheet ? (
            <IconButton icon={dsIcon('close')} onPress={() => setEditingSheet(false)} />
          ) : (
            <IconButton
              testID="edit-sheet"
              icon={dsIcon('edit')}
              onPress={() => setEditingSheet(true)}
            />
          )}
        </View>
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
  // Wound malus hits every roll, as do the 'all' effects — read once, above the
  // stat grids. A roll is an attribut PLUS a caractéristique, so badging them on
  // both tiles would show the same malus twice; a tile carries only its own.
  const wound = woundMalus(stRec);
  const global = globalModifier(effectList, wound);
  // Tapping a tile rolls that stat: the value plus everything modifying it
  // (wound + effects, which the tile's own badge deliberately does NOT show in
  // full), read against a difficulté. See lib/roll-context for the confirm rule.
  const rollStat = (key: string, kind: 'caracteristique' | 'attribut') => {
    const stat = STAT_LABELS[key];
    openRoller(
      statRollContext({
        key,
        label: stat?.label ?? key,
        abbr: stat?.abbr,
        value: rec[key] ?? 0,
        kind,
        effects: effectList,
        wound,
      }),
    );
  };

  const initiativeMax = rec.initiativeMax ?? 0;
  const initBonus = stRec.initiativeBonusDice ?? 0;
  // How many dice are actually in play this turn — sheet max plus the temporary
  // ones. Sizes the grid, the roll and the per-die writes alike.
  const initCount = initiativeDiceCount(initiativeMax, initBonus);
  const initStored = state?.initiativeValues ?? [];
  const initIcons = state?.initiativeDiceIcons ?? [];

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
  // XP is typed, not stepped, and the two counters are what gets stored: a
  // negative award or a negative spend is meaningless, so both clamp at 0 —
  // while their difference (the disponible) is free to go negative. See lib/xp.
  const setXp = (key: string, text: string) => setStateValue(key, clamp(Number(text) || 0, 0));

  const adjustRes = (key: string, delta: number) =>
    setStateValue(
      `${key}Current`,
      clamp((stRec[`${key}Current`] ?? 0) + delta, 0, rec[`${key}Max`] ?? 0),
    );

  // Editing one die's value leaves the order alone — only a roll re-sorts.
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

  // Losing a die also drops its stored roll AND its mark, so granting one back
  // shows an empty slot rather than a stale number under someone else's icon.
  const setInitBonus = (n: number) => {
    const next = initiativeDiceCount(initiativeMax, n);
    persistState({
      initiativeBonusDice: n,
      initiativeValues: trimInitiativeSlots(initStored, next),
      initiativeDiceIcons: trimInitiativeSlots(initIcons, next),
    });
  };

  // Roll every die in play at once: `initCount` plain D10, highest-first, each
  // mark carried along with its own roll.
  const rollInit = () => {
    const { values, icons } = rollInitiativeWithIcons(initCount, initIcons);
    persistState({ initiativeValues: values, initiativeDiceIcons: icons });
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
          // Cast because the typed-routes generator does not emit `/` for a root
          // index that sits inside a group ((root), the tab navigator); it lists
          // `/index` instead. The route is real — the web export builds it.
          router.dismissTo('/' as Href);
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={[styles.container, splitWidth]} bottomOffset={24}>
        <Columns>
          <SectionCard
            title="TENDANCES"
            icon="dragon">
            <TendancesTriangle
              get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })}
              onValue={
                editing ? (k, delta) => setCharValue(k, clamp((rec[k] ?? 0) + delta, 0)) : undefined
              }
              onSub={editing ? (k, n) => setCharValue(`${k}Sub`, n) : undefined}
            />
          </SectionCard>

          <GlobalModifierRow modifier={global} />

          <StatGrid
            title="ATTRIBUTS"
            icon="rune"
            stats={ATTRIBUTS}
            valueOf={(k) => num(rec[k])}
            modifierOf={(k) => statModifier(k, effectList)}
            onRoll={(k) => rollStat(k, 'attribut')}
          />

          <StatGrid
            title="CARACTÉRISTIQUES"
            icon="star"
            stats={CARAC_TILES}
            valueOf={(k) => num(rec[k])}
            modifierOf={(k) => statModifier(k, effectList)}
            onRoll={(k) => rollStat(k, 'caracteristique')}
          />

          <InitiativeSection
            max={initiativeMax}
            bonus={initBonus}
            values={initStored}
            icons={initIcons}
            wound={wound}
            onSetDie={setInit}
            onSetIcon={setInitIcon}
            onSetBonus={setInitBonus}
            onRoll={rollInit}
          />

          <HealthSection
            maxOf={(k) => rec[k] ?? 0}
            currentOf={(k) => stRec[k] ?? 0}
            onSet={setStateValue}
            editing={editing}
          />

          <EffectsCard
            characterId={numId}
            effects={effectList}
            skills={skills ?? []}
            editing={editing}
          />

          {equippedArmor ? <ArmorSection armor={equippedArmor} editing={editing} /> : null}
          {equippedShield ? <ShieldSection shield={equippedShield} editing={editing} /> : null}

          <ResourcesSection
            currentOf={(k) => stRec[k] ?? 0}
            maxOf={(k) => rec[k] ?? 0}
            adjust={adjustRes}
            onRefill={(k) => setStateValue(`${k}Current`, rec[`${k}Max`] ?? 0)}
            editing={editing}
          />

          <XpSection valueOf={(k) => stRec[k] ?? 0} onChange={setXp} editing={editing} />

          {state ? (
            <ConditionsCard state={state} editing={editing} onPersist={persistState} />
          ) : null}

          <SectionCard title="BIOGRAPHIE" icon="scroll">
            <Text>{txt(char.biographie)}</Text>
          </SectionCard>
        </Columns>
      </KeyboardAwareScrollView>

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
  // Two header icons side by side; IconButton brings its own spacing.
  headerActions: { flexDirection: 'row', alignItems: 'center' },
});
