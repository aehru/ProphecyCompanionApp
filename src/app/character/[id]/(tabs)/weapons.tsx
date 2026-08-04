import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput as RNTextInput } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import ArmorCard from '@/components/armor-card';
import ItemCard from '@/components/item-card';
import MoneySection from '@/components/fiche/money-section';
import ShieldCard from '@/components/shield-card';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { characterFallback } from '@/components/ui/character-gate';
import Columns from '@/components/ui/columns';
import EditableSection from '@/components/ui/editable-section';
import TabPage from '@/components/ui/tab-page';
import TabPager from '@/components/ui/tab-pager';
import WeaponCard from '@/components/weapon-card';
import { MONEY } from '@/constants/prophecy';
import type { ActualState } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useSplitWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { totalModifier, woundMalus } from '@/lib/modifiers';
import { weaponSkillReading } from '@/lib/weapon-skill';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery } from '@/repositories/armor';
import { enchantsQuery } from '@/repositories/enchants';
import { effectsQuery } from '@/repositories/effects';
import { createItem, itemsQuery } from '@/repositories/items';
import { shieldsQuery } from '@/repositories/shields';
import { skillsQuery } from '@/repositories/skills';
import { weaponsQuery } from '@/repositories/weapons';

const TABS = [
  'Armes',
  'Armures',
  { full: 'Boucliers', short: 'Boucl.' },
  'Objets',
] as const;

export default function CharacterWeaponsScreen() {
  const numId = useCharacterId();
  const router = useRouter();
  const theme = useProphecyTheme();
  const [tab, setTab] = useState(0);
  const [itemQuery, setItemQuery] = useState('');
  const splitWidth = useSplitWidth();
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
  // Skills: a weapon's attack total is its linked compétence's total.
  const { data: skills } = useLiveQuery(skillsQuery(numId), [numId]);

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
  const skillList = skills ?? [];
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

  // One page per category; each scrolls on its own under the pinned money card
  // and tab strip, and a horizontal swipe moves between them.
  const renderPage = (index: number) => {
    if (index === 0) {
      return (
        <TabPage>
          {list.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Aucune arme. Ajoutez-en une avec le bouton « Arme ».
            </Text>
          ) : (
            <Columns gap={10}>
              {list.map((w) => (
                <WeaponCard
                  key={w.id}
                  weapon={w}
                  caracValue={(k) => rec[k] ?? 0}
                  caracModifier={caracModifier}
                  skill={weaponSkillReading(w.skillName, skillList, rec, effectList, wound)}
                  enchanted={isEnchanted('weapon', w.id)}
                />
              ))}
            </Columns>
          )}
        </TabPage>
      );
    }
    if (index === 1) {
      return (
        <TabPage>
          {armorList.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Aucune armure. Ajoutez-en une avec le bouton « Armure ».
            </Text>
          ) : (
            <Columns gap={10}>
              {armorList.map((a) => (
                <ArmorCard
                  key={a.id}
                  armor={a}
                  caracValue={(k) => rec[k] ?? 0}
                  enchanted={isEnchanted('armor', a.id)}
                />
              ))}
            </Columns>
          )}
        </TabPage>
      );
    }
    if (index === 2) {
      return (
        <TabPage>
          {shieldList.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Aucun bouclier. Ajoutez-en un avec le bouton « Bouclier ».
            </Text>
          ) : (
            <Columns gap={10}>
              {shieldList.map((s) => (
                <ShieldCard
                  key={s.id}
                  shield={s}
                  caracValue={(k) => rec[k] ?? 0}
                  caracModifier={caracModifier}
                  enchanted={isEnchanted('shield', s.id)}
                />
              ))}
            </Columns>
          )}
        </TabPage>
      );
    }
    return (
      <TabPage>
        {/* Search scrolls with the list, as before. */}
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
          <Columns gap={10}>
            {filteredItems.map((it) => (
              <ItemCard key={it.id} item={it} enchanted={isEnchanted('item', it.id)} />
            ))}
          </Columns>
        )}
      </TabPage>
    );
  };

  return (
    <View style={styles.root}>
      {/* Money is pinned: it belongs to the whole inventory rather than to one
          category, and it is what a player checks mid-trade. */}
      <View style={[styles.money, splitWidth]}>
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
      </View>

      <TabPager labels={TABS} active={tab} onChange={setTab} renderPage={renderPage} />

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
  // Matches the pages' own padding, minus the bottom (the strip follows).
  money: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
});
