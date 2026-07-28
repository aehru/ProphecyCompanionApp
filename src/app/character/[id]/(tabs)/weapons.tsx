import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IconButton, Text, TextInput } from 'react-native-paper';

import ArmorCard from '@/components/armor-card';
import ItemCard from '@/components/item-card';
import NumberField from '@/components/number-field';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { characterFallback } from '@/components/ui/character-gate';
import EditableSection from '@/components/ui/editable-section';
import StatChip from '@/components/ui/stat-chip';
import WeaponCard from '@/components/weapon-card';
import type { ActualState } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { rollInitiative } from '@/lib/dice';
import { totalModifier, woundMalus } from '@/lib/modifiers';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery, createArmor } from '@/repositories/armor';
import { effectsQuery } from '@/repositories/effects';
import { createItem, itemsQuery } from '@/repositories/items';
import { weaponsQuery } from '@/repositories/weapons';

const TABS = ['Armes', 'Armures', 'Objets'] as const;

export default function CharacterWeaponsScreen() {
  const numId = useCharacterId();
  const router = useRouter();
  const theme = useProphecyTheme();
  const [tab, setTab] = useState(0);
  const [itemQuery, setItemQuery] = useState('');
  // ensure: initiative current-turn values live on actual_state, edited here.
  const { char, state, setState } = useCharacterState(numId, { ensure: true, reloadOnFocus: true });
  const { data: weapons } = useLiveQuery(weaponsQuery(numId), [numId]);
  const { data: armors } = useLiveQuery(armorQuery(numId), [numId]);
  const { data: items } = useLiveQuery(itemsQuery(numId), [numId]);
  const { data: effects } = useLiveQuery(effectsQuery(numId), [numId]);

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const list = weapons ?? [];
  const armorList = armors ?? [];
  const itemList = items ?? [];
  const filteredItems = itemQuery.trim()
    ? itemList.filter((it) => {
        const q = itemQuery.trim().toLowerCase();
        return it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
      })
    : itemList;
  // Wound malus + temporary effects, per caractéristique. Folded into each carac
  // value before the multiplier in a weapon's damage formula.
  const wound = woundMalus(asNumRecord(state));
  const effectList = effects ?? [];
  const caracModifier = (caracKey: string) => totalModifier(caracKey, effectList, wound);
  const initiativeMax = rec.initiativeMax ?? 0;
  const initStored = state?.initiativeValues ?? [];

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

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
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
                {vals.map((val, i) => {
                  if (editing) {
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
                  // driven to 0 or below is unusable → error border, like a weapon
                  // with unmet prerequisites.
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

        {/* Sub-tabs drive which category is shown (mirrors the campaign
            Compagnie screen's Attributs/Compétences/Tendances tabs). */}
        <View style={[styles.tabs, { borderBottomColor: theme.prophecy.borderSoft }]}>
          {TABS.map((label, i) => {
            const active = tab === i;
            return (
              <Pressable key={label} style={styles.tab} onPress={() => setTab(i)}>
                <Text
                  style={{
                    fontFamily: 'Cinzel_600SemiBold',
                    fontSize: 13,
                    color: active ? theme.colors.primary : theme.colors.onSurfaceVariant,
                  }}>
                  {label}
                </Text>
                <View
                  style={[
                    styles.tabInk,
                    { backgroundColor: active ? theme.colors.primary : 'transparent' },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {tab === 0 ? (
          <View style={styles.tabContent}>
            {list.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucune arme. Ajoutez-en une avec le bouton « Arme ».
              </Text>
            ) : (
              list.map((w) => (
                <WeaponCard
                  key={w.id}
                  weapon={w}
                  caracValue={(k) => rec[k] ?? 0}
                  caracModifier={caracModifier}
                />
              ))
            )}
          </View>
        ) : null}

        {tab === 1 ? (
          <View style={styles.tabContent}>
            {armorList.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucune armure. Ajoutez-en une avec le bouton « Armure ».
              </Text>
            ) : (
              armorList.map((a) => <ArmorCard key={a.id} armor={a} />)
            )}
          </View>
        ) : null}

        {tab === 2 ? (
          <View style={styles.tabContent}>
            {itemList.length > 0 ? (
              <TextInput
                mode="outlined"
                dense
                value={itemQuery}
                onChangeText={setItemQuery}
                placeholder="Rechercher un objet…"
                left={<TextInput.Icon icon="magnify" />}
                right={
                  itemQuery ? <TextInput.Icon icon="close" onPress={() => setItemQuery('')} /> : undefined
                }
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}
            {itemList.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucun objet. Ajoutez-en un avec le bouton « Objet ».
              </Text>
            ) : filteredItems.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucun objet ne correspond à « {itemQuery} ».
              </Text>
            ) : (
              filteredItems.map((it) => <ItemCard key={it.id} item={it} />)
            )}
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {tab === 0 ? (
        <AppFab
          icon={dsIcon('sword')}
          onPress={() => router.push(`/character/${numId}/weapon/catalog`)}
        />
      ) : null}
      {tab === 1 ? <AppFab icon="shield-plus" onPress={() => createArmor(numId)} /> : null}
      {tab === 2 ? <AppFab icon={dsIcon('backpack')} onPress={() => createItem(numId)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 160 },
  initRoll: { margin: 0 },
  initGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  initField: { flexGrow: 0, flexBasis: 72, minWidth: 72 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 8 },
  tabInk: { height: 2, alignSelf: 'stretch', borderRadius: 2 },
  tabContent: { gap: 10 },
});
