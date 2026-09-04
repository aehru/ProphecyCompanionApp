import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, TextInput } from 'react-native-paper';

import EnchantScoreSummary from '@/components/magic/enchant-score-summary';
import NumberField from '@/components/number-field';
import SpellDetail from '@/components/spell-detail';
import ChipSelect from '@/components/ui/chip-select';
import { dsIcon } from '@/components/ui/icon';
import type { Enchant, EnchantTarget, Spell } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import {
  ENCHANT_TARGET_OPTIONS,
  type EnchantTargetLists,
  targetsOfKind,
} from '@/lib/enchant-targets';
import { deleteEnchant, setEnchantSource, updateEnchant } from '@/repositories/enchants';

/**
 * Enchant editor form, rendered in the `enchant/[eid]` modal screen (mirrors
 * WeaponEditor/EffectEditor — a full screen rather than a dialog, since the
 * form runs long: target kind + target object + optional linked spell +
 * name/effect/max-uses). Free text persists live (debounced); target
 * kind/object, the spell link, and delete write immediately.
 */
export default function EnchantEditor({
  enchant: e,
  lists,
  spells,
  onPickFromCatalog,
  onClose,
}: {
  enchant: Enchant;
  /** Everything the character owns that can carry an enchantment. */
  lists: EnchantTargetLists;
  /** EVERY spell row of this character — the unknown enchant sources included. */
  spells: Spell[];
  /** Opens the catalogue picker, for a sortilège the character does not know. */
  onPickFromCatalog: () => void;
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
  // Both numbers CLEAR to null rather than to 0: an enchant with no recorded
  // roll is a normal state (pure flavour, or a sheet filled before the player
  // asked the GM), and a 0 would read as a botched cast instead of as silence.
  const [castScore, setCastScore] = useDebouncedText(numText(e.castScore), (t) =>
    updateEnchant(e.id, { castScore: parseScore(t) }),
  );
  const [difficulty, setDifficulty] = useDebouncedText(numText(e.difficulty), (t) =>
    updateEnchant(e.id, { difficulty: parseScore(t) }),
  );

  const targetOptions = targetsOfKind(e.targetType, lists).map((o) => ({
    key: String(o.id),
    label: o.name.trim() || '?',
  }));

  // sourceSpellId is a soft link (set null by the FK if the spell was
  // deleted) — fall back to the frozen name/effect snapshot when it's gone.
  const linkedSpell = e.sourceSpellId != null ? spells.find((s) => s.id === e.sourceSpellId) : undefined;

  // The chips offer the character's OWN sortilèges — plus this enchant's source
  // when it is one they don't know, which is the only way an unknown spell is
  // ever selectable. Picking a new unknown one goes through the catalogue.
  const spellOptions = [
    { key: '', label: 'Libre' },
    ...spells
      .filter((s) => s.known || s.id === linkedSpell?.id)
      .map((s) => ({ key: String(s.id), label: s.name.trim() || 'Sort' })),
  ];
  // The repository owns the copy of name/effect/difficulté and the cleanup of
  // an unknown source left behind — see `setEnchantSource`.
  const pickSpell = (key: string) => {
    if (!key) {
      setEnchantSource(e.id, null);
      return;
    }
    const sp = spells.find((s) => String(s.id) === key);
    if (sp) setEnchantSource(e.id, sp);
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
        options={ENCHANT_TARGET_OPTIONS}
        value={e.targetType}
        onChange={(k) => {
          const kind = k as EnchantTarget;
          // Only switch if the character owns at least one object of that
          // kind — otherwise there's nothing valid to point targetId at.
          const first = targetsOfKind(kind, lists)[0];
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

      {spellOptions.length > 1 ? (
        <ChipSelect
          label="Sort lié (optionnel — copie le nom et l’effet)"
          options={spellOptions}
          value={linkedSpell ? String(linkedSpell.id) : ''}
          onChange={pickSpell}
        />
      ) : null}

      {/* An object is routinely enchanted by SOMEONE ELSE — a mage the character
          paid — so the source may be any sortilège in the game, not one of the
          chips above. What the catalogue adds is recorded as unknown: it never
          joins the spellbook. */}
      <Button
        compact
        mode="outlined"
        icon={dsIcon('magic')}
        onPress={onPickFromCatalog}
        style={styles.viewSpellBtn}>
        Sort du catalogue…
      </Button>

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

      {/* The roll that made the object. It is the ENCHANTER's — usually not this
          character — so it is typed in, never rolled here, and a failed score is
          recorded as readily as a good one. */}
      <Text style={styles.sectionLabel}>Enchantement</Text>
      <View style={styles.scoreRow}>
        <NumberField
          fieldKey="castScore"
          label="Score obtenu"
          value={castScore}
          onChange={(_, t) => setCastScore(t)}
          style={styles.scoreField}
        />
        <NumberField
          fieldKey="difficulty"
          label="Difficulté"
          value={difficulty}
          onChange={(_, t) => setDifficulty(t)}
          style={styles.scoreField}
        />
      </View>
      <EnchantScoreSummary enchant={e} spell={linkedSpell} />

      <Button mode="outlined" icon="delete" textColor={theme.colors.error} onPress={confirmDelete}>
        Supprimer
      </Button>
    </>
  );
}

/** A nullable stored number as field text — empty when nothing was recorded. */
function numText(n: number | null): string {
  return n == null ? '' : String(n);
}

/** Field text back to a stored number: blank clears it, a score never goes below 0. */
function parseScore(t: string): number | null {
  const trimmed = t.trim();
  if (trimmed === '') return null;
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) ? null : Math.max(0, n);
}

const styles = StyleSheet.create({
  usesField: { flexGrow: 0, flexBasis: 140 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  scoreRow: { flexDirection: 'row', gap: 12 },
  scoreField: { flexGrow: 0, flexBasis: 140 },
  viewSpellBtn: { alignSelf: 'flex-start' },
  usesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usesLabel: { flex: 1, fontSize: 16 },
  usesCount: { minWidth: 56, textAlign: 'center', fontSize: 16 },
});
