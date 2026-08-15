import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useNavigation, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import EnchantRow from '@/components/magic/enchant-row';
import ReserveObjectDialog, {
  type ReserveObjectDraft,
} from '@/components/magic/reserve-object-dialog';
import ReserveTab from '@/components/magic/reserve-tab';
import SpellCard from '@/components/spell-card';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import Columns from '@/components/ui/columns';
import { dsIcon } from '@/components/ui/icon';
import TabPage from '@/components/ui/tab-page';
import TabPager from '@/components/ui/tab-pager';
import type {
  ActualState,
  Armor,
  Enchant,
  EnchantTarget,
  Item,
  MagicReserve,
  Shield,
  Weapon,
} from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useSpellTotal } from '@/hooks/use-spell-total';
import { asNumRecord } from '@/lib/character-values';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery } from '@/repositories/armor';
import { createEnchant, enchantsQuery } from '@/repositories/enchants';
import { itemsQuery } from '@/repositories/items';
import {
  createMagicReserve,
  deleteMagicReserve,
  magicReservesQuery,
  updateMagicReserve,
} from '@/repositories/magic-reserves';
import { shieldsQuery } from '@/repositories/shields';
import { spellsQuery } from '@/repositories/spells';
import { weaponsQuery } from '@/repositories/weapons';

const TABS = [
  { full: 'Réserve', short: 'Rés.' },
  { full: 'Sortilèges', short: 'Sorts' },
  { full: 'Enchantements', short: 'Enchant.' },
] as const;
const SPELLS_TAB = 1;
const ENCHANTS_TAB = 2;

/**
 * Magie tab — live in-play tracking only. Reserve and spheres are pools whose
 * max lives on the character (set in the sheet form's Magie tab); here the
 * current value is adjusted by tapping bullets, 5 per row. A sphere appears once
 * its max > 0. Disciplines are read-only stats (edited in the form).
 */
export default function CharacterMagicScreen() {
  const numId = useCharacterId();
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useProphecyTheme();
  // ensure: current magic values live on actual_state, edited here.
  const { char, state, setState } = useCharacterState(numId, {
    ensure: true,
    reloadOnFocus: true,
  });
  const { data: spells } = useLiveQuery(spellsQuery(numId), [numId]);
  const { data: reserves } = useLiveQuery(magicReservesQuery(numId), [numId]);
  const { data: weapons } = useLiveQuery(weaponsQuery(numId), [numId]);
  const { data: armors } = useLiveQuery(armorQuery(numId), [numId]);
  const { data: shieldRows } = useLiveQuery(shieldsQuery(numId), [numId]);
  const { data: items } = useLiveQuery(itemsQuery(numId), [numId]);
  const { data: enchantList } = useLiveQuery(enchantsQuery(numId), [numId]);
  const { totalFor: spellTotalFor, caracValue: spellCaracValue } = useSpellTotal(numId);
  const [tab, setTab] = useState(0);
  // Shared by the Réserve and Enchantements tabs: unlocks bullet-tapping plus
  // the reserve-object add/delete controls, same convention across this screen.
  const [editing, setEditing] = useEditToggle(navigation);
  const [draft, setDraft] = useState<ReserveObjectDraft | null>(null);

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);

  // Live writer: update local state immediately, persist in the background.
  const setStateValue = (key: string, value: number) => {
    setState((p) => (p ? ({ ...p, [key]: value } as ActualState) : p));
    updateActualState(numId, { [key]: value } as Partial<ActualState>);
  };

  const objects: MagicReserve[] = reserves ?? [];
  const weaponList: Weapon[] = weapons ?? [];
  const armorList: Armor[] = armors ?? [];
  const shieldList: Shield[] = shieldRows ?? [];
  const itemList: Item[] = items ?? [];
  const enchants: Enchant[] = enchantList ?? [];
  const spellList = spells ?? [];

  const targetListFor = (kind: EnchantTarget) =>
    kind === 'weapon' ? weaponList : kind === 'armor' ? armorList : kind === 'shield' ? shieldList : itemList;

  const targetOf = (e: Enchant) => targetListFor(e.targetType).find((o) => o.id === e.targetId);

  const isEquipped = (kind: EnchantTarget, o: Weapon | Armor | Shield | Item) =>
    kind === 'weapon' ? (o as Weapon).equippedHand != null : (o as Armor | Shield | Item).equipped;

  // Reserve objects: each is its own pool, so saving only writes nom/max —
  // `current` is driven by the bullets (and clamped by the repository).
  const saveDraft = () => {
    if (!draft) return;
    const nom = draft.nom.trim();
    const max = Math.max(0, parseInt(draft.max, 10) || 0);
    if (draft.id == null) createMagicReserve(numId, { nom, max });
    else updateMagicReserve(draft.id, { nom, max });
    setDraft(null);
  };

  const confirmDeleteObject = (o: MagicReserve) =>
    Alert.alert('Supprimer', `Supprimer « ${o.nom.trim() || 'cet objet'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMagicReserve(o.id) },
    ]);

  // New enchant starts blank on the first object the character owns (any
  // kind) — the editor screen lets the player fix the target, add a name, a
  // linked spell or free effect text, and a charge count.
  const firstTarget: { type: EnchantTarget; id: number } | null = weaponList[0]
    ? { type: 'weapon', id: weaponList[0].id }
    : armorList[0]
      ? { type: 'armor', id: armorList[0].id }
      : shieldList[0]
        ? { type: 'shield', id: shieldList[0].id }
        : itemList[0]
          ? { type: 'item', id: itemList[0].id }
          : null;

  const addEnchant = async () => {
    if (!firstTarget) return;
    const row = await createEnchant(numId, firstTarget.type, firstTarget.id, {
      name: '',
      effect: '',
      usesMax: 1,
      usesCurrent: 1,
    });
    router.push(`/character/${numId}/enchant/${row.id}`);
  };

  // One page per tab. Each owns its scrolling, so the strip above stays pinned
  // while a page scrolls — and a horizontal swipe moves between them.
  const renderPage = (index: number) => {
    if (index === 0) {
      return (
        <TabPage>
          <ReserveTab
            rec={rec}
            stRec={stRec}
            editing={editing}
            objects={objects}
            onSetCurrent={setStateValue}
            onSetObjectCurrent={(o, n) => updateMagicReserve(o.id, { current: n })}
            onEditObject={(o) => setDraft({ id: o.id, nom: o.nom, max: String(o.max) })}
            onAddObject={() => setDraft({ id: null, nom: '', max: '3' })}
            onDeleteObject={confirmDeleteObject}
          />
        </TabPage>
      );
    }
    if (index === SPELLS_TAB) {
      return (
        <TabPage>
          {spellList.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Aucun sortilège. Ajoutez-en un avec le bouton « Sort ».
            </Text>
          ) : (
            <Columns gap={10}>
              {spellList.map((sp) => (
                <SpellCard
                  key={sp.id}
                  spell={sp}
                  total={spellTotalFor(sp)}
                  caracValue={spellCaracValue}
                />
              ))}
            </Columns>
          )}
        </TabPage>
      );
    }
    return (
      <TabPage>
        {enchants.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Aucun enchantement.{' '}
            {firstTarget
              ? 'Ajoutez-en un avec le bouton « Enchantement ».'
              : 'Ajoutez d’abord une arme, une armure, un bouclier ou un objet à enchanter.'}
          </Text>
        ) : (
          <Columns gap={10}>
            {enchants.map((e) => {
              const target = targetOf(e);
              return (
                <EnchantRow
                  key={e.id}
                  enchant={e}
                  target={target}
                  equipped={target ? isEquipped(e.targetType, target) : false}
                  editing={editing}
                  spells={spellList}
                  onOpen={() => router.push(`/character/${numId}/enchant/${e.id}`)}
                />
              );
            })}
          </Columns>
        )}
      </TabPage>
    );
  };

  return (
    <View style={styles.root}>
      <TabPager labels={TABS} active={tab} onChange={setTab} renderPage={renderPage} />

      {tab === SPELLS_TAB ? (
        <AppFab
          icon={dsIcon('magic')}
          onPress={() => router.push(`/character/${numId}/spell/catalog`)}
        />
      ) : tab === ENCHANTS_TAB ? (
        <>
          <AppFab icon={dsIcon('plus')} onPress={addEnchant} disabled={!firstTarget} offset={72} />
          <AppFab icon={editing ? dsIcon('check') : dsIcon('edit')} onPress={() => setEditing((e) => !e)} />
        </>
      ) : (
        <AppFab icon={editing ? dsIcon('check') : dsIcon('edit')} onPress={() => setEditing((e) => !e)} />
      )}

      <ReserveObjectDialog
        draft={draft}
        onChange={setDraft}
        onDismiss={() => setDraft(null)}
        onSave={saveDraft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
