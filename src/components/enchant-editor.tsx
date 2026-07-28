import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SpellDetail from '@/components/spell-detail';
import ChipSelect from '@/components/ui/chip-select';
import { dsIcon } from '@/components/ui/icon';
import type { Armor, Enchant, EnchantTarget, Item, Spell, Weapon } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { deleteEnchant, updateEnchant } from '@/repositories/enchants';

const TARGET_KIND_OPTIONS = [
  { key: 'weapon', label: 'Arme' },
  { key: 'armor', label: 'Armure' },
  { key: 'item', label: 'Objet' },
] as const;

/**
 * Enchant editor form, rendered in the `enchant/[eid]` modal screen (mirrors
 * WeaponEditor/EffectEditor — a full screen rather than a dialog, since the
 * form runs long: target kind + target object + optional linked spell +
 * name/effect/max-uses). Free text persists live (debounced); target
 * kind/object, the spell link, and delete write immediately.
 */
export default function EnchantEditor({
  enchant: e,
  weapons,
  armor,
  items,
  spells,
  onClose,
}: {
  enchant: Enchant;
  weapons: Weapon[];
  armor: Armor[];
  items: Item[];
  spells: Spell[];
  onClose: () => void;
}) {
  const theme = useProphecyTheme();
  const [showSpell, setShowSpell] = useState(false);
  const [name, setName] = useDebouncedText(e.name, (t) => updateEnchant(e.id, { name: t }));
  const [effect, setEffect] = useDebouncedText(e.effect, (t) => updateEnchant(e.id, { effect: t }));
  const [usesMax, setUsesMax] = useDebouncedText(String(e.usesMax), (t) => {
    const max = Math.max(1, parseInt(t, 10) || 1);
    updateEnchant(e.id, { usesMax: max, usesCurrent: Math.min(e.usesCurrent, max) });
  });

  const targetListFor = (kind: EnchantTarget) =>
    kind === 'weapon' ? weapons : kind === 'armor' ? armor : items;
  const targetOptions = targetListFor(e.targetType).map((o) => ({
    key: String(o.id),
    label: o.name.trim() || '?',
  }));

  const spellOptions = [
    { key: '', label: 'Libre' },
    ...spells.map((s) => ({ key: String(s.id), label: s.name.trim() || 'Sort' })),
  ];
  // sourceSpellId is a soft link (set null by the FK if the spell was
  // deleted) — fall back to the frozen name/effect snapshot when it's gone.
  const linkedSpell = e.sourceSpellId != null ? spells.find((s) => s.id === e.sourceSpellId) : undefined;

  const pickSpell = (key: string) => {
    if (!key) {
      updateEnchant(e.id, { sourceSpellName: null, sourceSpellId: null });
      return;
    }
    const sp = spells.find((s) => String(s.id) === key);
    if (!sp) return;
    updateEnchant(e.id, { name: sp.name, effect: sp.effect, sourceSpellName: sp.name, sourceSpellId: sp.id });
  };

  const adjustUses = (delta: number) => {
    const max = Math.max(1, parseInt(usesMax, 10) || 1);
    const next = Math.min(max, Math.max(0, e.usesCurrent + delta));
    updateEnchant(e.id, { usesCurrent: next });
  };

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cet enchantement ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteEnchant(e.id);
          onClose();
        },
      },
    ]);

  return (
    <>
      <ChipSelect
        label="Cible"
        options={TARGET_KIND_OPTIONS}
        value={e.targetType}
        onChange={(k) => {
          const kind = k as EnchantTarget;
          // Only switch if the character owns at least one object of that
          // kind — otherwise there's nothing valid to point targetId at.
          const first = targetListFor(kind)[0];
          if (first) updateEnchant(e.id, { targetType: kind, targetId: first.id });
        }}
      />

      {targetOptions.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Aucun objet de ce type.</Text>
      ) : (
        <ChipSelect
          label="Objet"
          options={targetOptions}
          value={String(e.targetId)}
          onChange={(k) => updateEnchant(e.id, { targetId: Number(k) })}
        />
      )}

      {spells.length > 0 ? (
        <ChipSelect
          label="Sort lié (optionnel — copie le nom et l’effet)"
          options={spellOptions}
          value={linkedSpell ? String(linkedSpell.id) : ''}
          onChange={pickSpell}
        />
      ) : null}

      {linkedSpell ? (
        <Button
          compact
          mode="outlined"
          icon={dsIcon('magic')}
          onPress={() => setShowSpell((v) => !v)}
          style={styles.viewSpellBtn}>
          {showSpell ? 'Masquer le sort' : 'Voir le sort'}
        </Button>
      ) : null}
      {showSpell && linkedSpell ? <SpellDetail spell={linkedSpell} /> : null}

      <TextInput label="Nom de l’enchantement" value={name} onChangeText={setName} mode="outlined" dense />
      <TextInput label="Effet" value={effect} onChangeText={setEffect} mode="outlined" dense multiline />

      <NumberField
        fieldKey="usesMax"
        label="Utilisations max"
        value={usesMax}
        onChange={(_, t) => setUsesMax(t)}
        style={styles.usesField}
      />

      <View style={styles.usesRow}>
        <Text style={styles.usesLabel}>Utilisations restantes</Text>
        <IconButton
          icon="minus"
          mode="contained"
          size={16}
          disabled={e.usesCurrent <= 0}
          onPress={() => adjustUses(-1)}
        />
        <Text style={styles.usesCount}>
          {e.usesCurrent} / {e.usesMax}
        </Text>
        <IconButton
          icon={dsIcon('plus')}
          mode="contained"
          size={16}
          disabled={e.usesCurrent >= e.usesMax}
          onPress={() => adjustUses(1)}
        />
      </View>

      <Button mode="outlined" icon="delete" textColor={theme.colors.error} onPress={confirmDelete}>
        Supprimer
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  usesField: { flexGrow: 0, flexBasis: 140 },
  viewSpellBtn: { alignSelf: 'flex-start' },
  usesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usesLabel: { flex: 1, fontSize: 16 },
  usesCount: { minWidth: 56, textAlign: 'center', fontSize: 16 },
});
