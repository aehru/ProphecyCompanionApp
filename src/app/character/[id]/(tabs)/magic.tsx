import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useNavigation, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, Dialog, Icon, IconButton, Portal, Text, TextInput } from 'react-native-paper';

import Bullets from '@/components/bullets';
import NumberField from '@/components/number-field';
import SpellCard from '@/components/spell-card';
import SpellDetail from '@/components/spell-detail';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { DISCIPLINES, SPHERES } from '@/constants/prophecy';
import type {
  ActualState,
  Armor,
  Enchant,
  EnchantTarget,
  Item,
  MagicReserve,
  Spell,
  Weapon,
} from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, num } from '@/lib/character-values';
import { updateActualState } from '@/repositories/actual-state';
import { armorQuery } from '@/repositories/armor';
import { createEnchant, enchantsQuery, updateEnchant } from '@/repositories/enchants';
import { itemsQuery } from '@/repositories/items';
import {
  createMagicReserve,
  deleteMagicReserve,
  magicReservesQuery,
  updateMagicReserve,
} from '@/repositories/magic-reserves';
import { spellsQuery } from '@/repositories/spells';
import { weaponsQuery } from '@/repositories/weapons';

const TABS = ['Réserve', 'Sortilèges', 'Enchant.'] as const;

const TARGET_KIND_LABEL: Record<EnchantTarget, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  item: 'Objet',
};

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
  const { data: items } = useLiveQuery(itemsQuery(numId), [numId]);
  const { data: enchantList } = useLiveQuery(enchantsQuery(numId), [numId]);
  const [tab, setTab] = React.useState(0);
  // Shared by the Réserve and Enchantements tabs: unlocks bullet-tapping plus
  // the reserve-object add/delete controls, same convention across this screen.
  const [editing, setEditing] = useEditToggle(navigation);
  // Add/edit dialog for reserve objects (short form — a dialog still fits).
  // `id: null` = creating a new one.
  const [draft, setDraft] = React.useState<{ id: number | null; nom: string; max: string } | null>(
    null,
  );

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);

  // Live writer: update local state immediately, persist in the background.
  const setStateValue = (key: string, value: number) => {
    setState((p) => (p ? ({ ...p, [key]: value } as ActualState) : p));
    updateActualState(numId, { [key]: value } as Partial<ActualState>);
  };

  const dotColor = editing ? theme.colors.primary : theme.colors.onSurfaceVariant;
  const reserveMax = rec.reserveMagiqueMax ?? 0;
  const reserveCur = stRec.reserveMagiqueCurrent ?? 0;
  const knownSpheres = SPHERES.filter((s) => (rec[`${s.key}Max`] ?? 0) > 0);
  const objects: MagicReserve[] = reserves ?? [];
  const weaponList: Weapon[] = weapons ?? [];
  const armorList: Armor[] = armors ?? [];
  const itemList: Item[] = items ?? [];
  const enchants: Enchant[] = enchantList ?? [];
  const spellList = spells ?? [];

  const targetListFor = (kind: EnchantTarget) =>
    kind === 'weapon' ? weaponList : kind === 'armor' ? armorList : itemList;

  const targetOf = (e: Enchant) => targetListFor(e.targetType).find((o) => o.id === e.targetId);

  const isEquipped = (kind: EnchantTarget, o: Weapon | Armor | Item) =>
    kind === 'weapon' ? (o as Weapon).equippedHand != null : (o as Armor | Item).equipped;

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

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
        {/* Sub-tabs (mirrors the Armes/Armures/Objets tabs on the Inventaire
            screen). */}
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
          <>
            <SectionCard title="DISCIPLINES" icon="book">
              <View style={styles.grid}>
                {DISCIPLINES.map((d) => (
                  <StatChip key={d.key} label={d.label} value={num(rec[d.key])} />
                ))}
              </View>
            </SectionCard>

            <SectionCard title="RÉSERVE" icon="magic">
              <View style={styles.sphereRow}>
                <Text style={styles.sphereLabel}>Globale</Text>
                <Bullets
                  count={reserveMax}
                  filled={reserveCur}
                  perRow={5}
                  color={dotColor}
                  size={18}
                  gap={6}
                  onSet={editing ? (n) => setStateValue('reserveMagiqueCurrent', n) : undefined}
                />
              </View>

              {knownSpheres.map((s) => {
                const curKey = `${s.key}Current`;
                return (
                  <View
                    key={s.key}
                    style={[
                      styles.sphereRow,
                      styles.sphereDivider,
                      { borderTopColor: theme.colors.outlineVariant },
                    ]}>
                    <Text style={styles.sphereLabel}>{s.label}</Text>
                    <Bullets
                      count={rec[`${s.key}Max`] ?? 0}
                      filled={stRec[curKey] ?? 0}
                      perRow={5}
                      color={dotColor}
                      size={18}
                      gap={6}
                      onSet={editing ? (n) => setStateValue(curKey, n) : undefined}
                    />
                  </View>
                );
              })}
            </SectionCard>

            {/* Gear, not everyone's business: the section only exists once the
                character owns an object — or while editing, to add the first one. */}
            {objects.length === 0 && !editing ? null : (
              <SectionCard title="OBJETS DE RÉSERVE" icon="magic">
                {objects.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Aucun objet. Ajoutez-en un ci-dessous.
                  </Text>
                ) : (
                  objects.map((o) => (
                    <View
                      key={o.id}
                      style={[
                        styles.sphereRow,
                        styles.objectRow,
                        { borderBottomColor: theme.prophecy.borderSoft },
                      ]}>
                      <Pressable
                        style={styles.objectLabel}
                        disabled={!editing}
                        onPress={() => setDraft({ id: o.id, nom: o.nom, max: String(o.max) })}>
                        <Text style={styles.sphereLabel}>{o.nom.trim() || 'Objet'}</Text>
                        {editing ? (
                          <Text style={[styles.objectHint, { color: theme.colors.onSurfaceVariant }]}>
                            Modifier
                          </Text>
                        ) : null}
                      </Pressable>
                      <Bullets
                        count={o.max}
                        filled={o.current}
                        perRow={5}
                        color={dotColor}
                        size={18}
                        gap={6}
                        style={styles.objectBullets}
                        onSet={editing ? (n) => updateMagicReserve(o.id, { current: n }) : undefined}
                      />
                      {editing ? (
                        <IconButton
                          icon="delete"
                          size={18}
                          iconColor={theme.colors.error}
                          onPress={() => confirmDeleteObject(o)}
                        />
                      ) : null}
                    </View>
                  ))
                )}

                {editing ? (
                  <Button
                    mode="outlined"
                    icon={dsIcon('plus')}
                    onPress={() => setDraft({ id: null, nom: '', max: '3' })}>
                    Ajouter un objet
                  </Button>
                ) : null}
              </SectionCard>
            )}
          </>
        ) : null}

        {tab === 1 ? (
          <View style={styles.tabContent}>
            {spellList.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucun sortilège. Ajoutez-en un avec le bouton « Sort ».
              </Text>
            ) : (
              spellList.map((sp) => <SpellCard key={sp.id} spell={sp} />)
            )}
          </View>
        ) : null}

        {tab === 2 ? (
          <View style={styles.tabContent}>
            {enchants.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucun enchantement.{' '}
                {firstTarget
                  ? 'Ajoutez-en un avec le bouton « Enchantement ».'
                  : 'Ajoutez d’abord une arme, une armure ou un objet à enchanter.'}
              </Text>
            ) : (
              enchants.map((e) => {
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
              })
            )}
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {tab === 1 ? (
        <AppFab
          icon={dsIcon('magic')}
          onPress={() => router.push(`/character/${numId}/spell/catalog`)}
        />
      ) : tab === 2 ? (
        <>
          <AppFab icon={dsIcon('plus')} onPress={addEnchant} disabled={!firstTarget} offset={72} />
          <AppFab icon={editing ? dsIcon('check') : dsIcon('edit')} onPress={() => setEditing((e) => !e)} />
        </>
      ) : (
        <AppFab icon={editing ? dsIcon('check') : dsIcon('edit')} onPress={() => setEditing((e) => !e)} />
      )}

      <Portal>
        <Dialog
          visible={draft !== null}
          onDismiss={() => setDraft(null)}
          style={[styles.dialog, { borderColor: theme.prophecy.border }]}>
          <Dialog.Title>{draft?.id == null ? 'Nouvel objet' : 'Modifier l’objet'}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Nom de l’objet"
              value={draft?.nom ?? ''}
              onChangeText={(t) => setDraft((d) => (d ? { ...d, nom: t } : d))}
            />
            <NumberField
              fieldKey="max"
              label="Puces de magie"
              value={draft?.max ?? ''}
              onChange={(_, t) => setDraft((d) => (d ? { ...d, max: t } : d))}
              style={styles.maxField}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDraft(null)}>Annuler</Button>
            <Button
              mode="contained"
              icon={dsIcon(draft?.id == null ? 'plus' : 'check')}
              onPress={saveDraft}
              disabled={!draft?.nom.trim()}>
              {draft?.id == null ? 'Ajouter' : 'Enregistrer'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

/**
 * One enchant row: name/target summary (tap → full editor), a current/max
 * charge stepper (editing-gated, mirrors ResourcesSection's Chance/Maîtrise
 * controls), and — only when `sourceSpellId` still resolves to a real spell —
 * a toggle that expands the same read-only SpellDetail used by SpellCard,
 * inline rather than as a popup/modal.
 */
function EnchantRow({
  enchant: e,
  target,
  equipped,
  editing,
  spells,
  onOpen,
}: {
  enchant: Enchant;
  target: Weapon | Armor | Item | undefined;
  equipped: boolean;
  editing: boolean;
  spells: Spell[];
  onOpen: () => void;
}) {
  const theme = useProphecyTheme();
  const [showSpell, setShowSpell] = useState(false);
  const linkedSpell = e.sourceSpellId != null ? spells.find((s) => s.id === e.sourceSpellId) : undefined;

  return (
    <View style={[styles.enchantCard, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <View style={styles.enchantHeader}>
        <Pressable style={styles.enchantRow} onPress={onOpen}>
          <View style={styles.enchantLabel}>
            <Text style={styles.enchantName} numberOfLines={1}>
              {e.name.trim() || 'Enchantement'}
            </Text>
            <Text style={[styles.objectHint, { color: theme.colors.onSurfaceVariant }]}>
              {target?.name.trim() || '?'} · {TARGET_KIND_LABEL[e.targetType]}
              {!equipped ? ' · non équipé' : ''}
            </Text>
            {e.sourceSpellName ? (
              <Text style={[styles.objectHint, { color: theme.colors.onSurfaceVariant }]}>
                D’après : {e.sourceSpellName}
              </Text>
            ) : null}
          </View>
          <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
        </Pressable>
        {linkedSpell ? (
          <IconButton
            icon={showSpell ? 'chevron-up' : dsIcon('magic')}
            size={18}
            onPress={() => setShowSpell((v) => !v)}
          />
        ) : null}
      </View>

      <View style={styles.usesRow}>
        <Text style={styles.usesLabel}>Utilisations</Text>
        {editing ? (
          <IconButton
            icon="minus"
            mode="contained"
            size={16}
            disabled={e.usesCurrent <= 0}
            onPress={() => updateEnchant(e.id, { usesCurrent: Math.max(0, e.usesCurrent - 1) })}
          />
        ) : null}
        <Text style={styles.usesCount}>
          {e.usesCurrent} / {e.usesMax}
        </Text>
        {editing ? (
          <IconButton
            icon={dsIcon('plus')}
            mode="contained"
            size={16}
            disabled={e.usesCurrent >= e.usesMax}
            onPress={() => updateEnchant(e.id, { usesCurrent: Math.min(e.usesMax, e.usesCurrent + 1) })}
          />
        ) : null}
      </View>

      {showSpell && linkedSpell ? <SpellDetail spell={linkedSpell} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 160 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  sphereRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sphereDivider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  sphereLabel: { width: 72, fontSize: 15, lineHeight: 16 },
  // Reserve objects: name column keeps the sphere alignment, bullets take the
  // rest so the delete button stays pinned right. Bottom hairline like the DS
  // inventory rows (spell/weapon/armor cards), not the sphere top divider.
  objectRow: { alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
  objectLabel: { width: 72 },
  // Enchant rows stack (name/target header, then a uses stepper, then an
  // optional inline spell view) rather than sitting beside the bullets like
  // a reserve object, so they get their own vertical container.
  enchantCard: { paddingVertical: 6, borderBottomWidth: 1, gap: 6 },
  enchantHeader: { flexDirection: 'row', alignItems: 'center' },
  enchantRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  enchantLabel: { flex: 1, minWidth: 0 },
  enchantName: { fontSize: 15, fontWeight: '600' },
  objectHint: { fontSize: 11 },
  objectBullets: { flex: 1 },
  usesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usesLabel: { flex: 1, fontSize: 15 },
  usesCount: { minWidth: 56, textAlign: 'center', fontSize: 15 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 8 },
  tabInk: { height: 2, alignSelf: 'stretch', borderRadius: 2 },
  tabContent: { gap: 10 },
  // DS dialog surface (same as the campaigns dialogs / dice roller): tighter
  // radius + a 1px gold hairline (Paper's default Dialog corner balloons and
  // has no border).
  dialog: { borderRadius: 18, borderWidth: 1 },
  dialogContent: { gap: 16 },
  maxField: { flexGrow: 0, flexBasis: 110 },
});
