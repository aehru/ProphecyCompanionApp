import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput as RNTextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text, TextInput } from 'react-native-paper';

import ArmorCard from '@/components/armor-card';
import ItemCard from '@/components/item-card';
import MoneySection from '@/components/fiche/money-section';
import ShieldCard from '@/components/shield-card';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { characterFallback } from '@/components/ui/character-gate';
import EditableSection from '@/components/ui/editable-section';
import WeaponCard from '@/components/weapon-card';
import { MONEY } from '@/constants/prophecy';
import type { ActualState } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { totalModifier, woundMalus } from '@/lib/modifiers';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery } from '@/repositories/armor';
import { enchantsQuery } from '@/repositories/enchants';
import { effectsQuery } from '@/repositories/effects';
import { createItem, itemsQuery } from '@/repositories/items';
import { shieldsQuery } from '@/repositories/shields';
import { weaponsQuery } from '@/repositories/weapons';

const TABS = ['Armes', 'Armures', 'Boucliers', 'Objets'] as const;

export default function CharacterWeaponsScreen() {
  const numId = useCharacterId();
  const router = useRouter();
  const theme = useProphecyTheme();
  const [tab, setTab] = useState(0);
  const [itemQuery, setItemQuery] = useState('');
  // Keyboard "next" wiring for the ARGENT fields (self-contained here — money
  // is the only chained field group left on this screen).
  const moneyRefs = useRef<Record<string, RNTextInput | null>>({});
  // ensure: money (dracs) lives on actual_state, edited here.
  const { char, state, setState } = useCharacterState(numId, { ensure: true, reloadOnFocus: true });
  const { data: weapons } = useLiveQuery(weaponsQuery(numId), [numId]);
  const { data: armors } = useLiveQuery(armorQuery(numId), [numId]);
  const { data: shields } = useLiveQuery(shieldsQuery(numId), [numId]);
  const { data: items } = useLiveQuery(itemsQuery(numId), [numId]);
  const { data: effects } = useLiveQuery(effectsQuery(numId), [numId]);
  const { data: enchants } = useLiveQuery(enchantsQuery(numId), [numId]);

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const list = weapons ?? [];
  const armorList = armors ?? [];
  const shieldList = shields ?? [];
  const itemList = items ?? [];
  const filteredItems = itemQuery.trim()
    ? itemList.filter((it) => {
        const q = itemQuery.trim().toLowerCase();
        return it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
      })
    : itemList;
  // Which weapons/armor/shields/items carry at least one enchant — drives the
  // small "enchantée" badge on each card (full detail lives in the Magie tab).
  const enchantedKeys = new Set((enchants ?? []).map((e) => `${e.targetType}:${e.targetId}`));
  const isEnchanted = (kind: 'weapon' | 'armor' | 'shield' | 'item', id: number) =>
    enchantedKeys.has(`${kind}:${id}`);
  const stRec = asNumRecord(state);
  // Wound malus + temporary effects, per caractéristique. Folded into each carac
  // value before the multiplier in a weapon's damage formula.
  const wound = woundMalus(stRec);
  const effectList = effects ?? [];
  const caracModifier = (caracKey: string) => totalModifier(caracKey, effectList, wound);

  const setStateValue = (key: string, value: number) => {
    setState((p) => (p ? ({ ...p, [key]: value } as ActualState) : p));
    updateActualState(numId, { [key]: value } as Partial<ActualState>);
  };

  const moneyKeys: string[] = MONEY.map((m) => m.key);
  const moneyChain = (key: string) => {
    const i = moneyKeys.indexOf(key);
    const isLast = i === moneyKeys.length - 1;
    return {
      inputRef: (el: RNTextInput | null) => {
        moneyRefs.current[key] = el;
      },
      returnKeyType: (isLast ? 'done' : 'next') as 'done' | 'next',
      submitBehavior: (isLast ? 'blurAndSubmit' : 'submit') as 'blurAndSubmit' | 'submit',
      onSubmitEditing: () => moneyRefs.current[moneyKeys[i + 1]]?.focus(),
    };
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={[styles.container, contentWidth]} bottomOffset={24}>
        <EditableSection title="ARGENT" icon="coin">
          {(editing) => (
            <MoneySection
              valueOf={(k) => String(stRec[k] ?? 0)}
              onChange={(k, t) => setStateValue(k, Number(t) || 0)}
              chain={moneyChain}
              editing={editing}
            />
          )}
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
                  enchanted={isEnchanted('weapon', w.id)}
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
              armorList.map((a) => (
                <ArmorCard
                  key={a.id}
                  armor={a}
                  caracValue={(k) => rec[k] ?? 0}
                  enchanted={isEnchanted('armor', a.id)}
                />
              ))
            )}
          </View>
        ) : null}

        {tab === 2 ? (
          <View style={styles.tabContent}>
            {shieldList.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucun bouclier. Ajoutez-en un avec le bouton « Bouclier ».
              </Text>
            ) : (
              shieldList.map((s) => (
                <ShieldCard
                  key={s.id}
                  shield={s}
                  caracValue={(k) => rec[k] ?? 0}
                  caracModifier={caracModifier}
                  enchanted={isEnchanted('shield', s.id)}
                />
              ))
            )}
          </View>
        ) : null}

        {tab === 3 ? (
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
              filteredItems.map((it) => (
                <ItemCard key={it.id} item={it} enchanted={isEnchanted('item', it.id)} />
              ))
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
      {tab === 1 ? (
        <AppFab
          icon="shield-plus"
          onPress={() => router.push(`/character/${numId}/armor/catalog`)}
        />
      ) : null}
      {tab === 2 ? (
        <AppFab
          icon="shield-sword"
          onPress={() => router.push(`/character/${numId}/shield/catalog`)}
        />
      ) : null}
      {tab === 3 ? <AppFab icon={dsIcon('backpack')} onPress={() => createItem(numId)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 160 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 8 },
  tabInk: { height: 2, alignSelf: 'stretch', borderRadius: 2 },
  tabContent: { gap: 10 },
});
