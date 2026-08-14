import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button, Checkbox, Icon, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import { dsIcon } from '@/components/ui/icon';
import SelectField from '@/components/ui/select-field';
import SectionCard from '@/components/ui/section-card';
import {
  EFFECT_TARGET_LABEL,
  EFFECT_TARGETS,
  PERMANENT_UNIT,
  TIME_UNIT_LABEL,
  TIME_UNITS,
} from '@/constants/prophecy';
import type { Effect, Skill } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fmtSignedMod, isSkillTarget, skillTarget, skillTargetName } from '@/lib/modifiers';
import { deleteEffect, tickUnit, updateEffect } from '@/repositories/effects';

/** Display label for an effect target: a skill name, a stat label, or the raw key. */
function targetLabelFor(target: string): string {
  if (isSkillTarget(target)) return skillTargetName(target);
  return EFFECT_TARGET_LABEL[target] ?? target;
}

/** An effect targets a skill that the character no longer owns (renamed/deleted). */
function isOrphanSkill(target: string, skills: Skill[]): boolean {
  return isSkillTarget(target) && !skills.some((s) => s.name === skillTargetName(target));
}

/**
 * Temporary bonuses/maluses for the résumé tab. Each row is a summary that opens
 * the full editor (`effect/[eid]` modal) on tap — adding is done from the tab's
 * second FAB, so the card itself never spawns empty rows. The tab edit toggle
 * only exposes the per-unit "time passes" controls (tick a unit's effects −1);
 * it does NOT add delete/edit controls, since editing lives on the editor screen.
 *
 * `permanent` effects never tick or expire; effects targeting a skill by name
 * that no longer exists are flagged as orphaned (they simply stop applying).
 */
export default function EffectsCard({
  effects,
  skills,
  editing,
}: {
  effects: Effect[];
  // Character's owned skills — used to flag orphaned skill targets.
  skills: Skill[];
  editing: boolean;
}) {
  const theme = useProphecyTheme();
  const router = useRouter();

  // Units that still have at least one active effect — the only ones worth
  // offering a "time passes" button for. PERMANENT_UNIT is not in TIME_UNITS,
  // so permanent effects never appear here.
  const liveUnits = TIME_UNITS.filter((u) =>
    effects.some((e) => !e.expired && e.durationUnit === u.key),
  );

  return (
    <SectionCard title="EFFETS" icon="fire">
      {effects.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Aucun effet. Ajoutez-en un avec le bouton « Effet ».
        </Text>
      ) : (
        effects.map((e) => (
          <EffectRow
            key={e.id}
            effect={e}
            orphan={isOrphanSkill(e.target, skills)}
            onPress={() => router.push(`/character/${e.characterId}/effect/${e.id}`)}
          />
        ))
      )}

      {editing && liveUnits.length > 0 ? (
        <View style={styles.timeBlock}>
          <Text style={[styles.timeLabel, { color: theme.colors.onSurfaceVariant }]}>
            Temps écoulé :
          </Text>
          <View style={styles.timeRow}>
            {liveUnits.map((u) => (
              <Button
                key={u.key}
                mode="outlined"
                compact
                icon="clock-minus-outline"
                onPress={() => tickUnit(effects[0].characterId, u.key)}>
                {u.label} −1
              </Button>
            ))}
          </View>
        </View>
      ) : null}
    </SectionCard>
  );
}

function parseSigned(t: string) {
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? 0 : n;
}

function EffectRow({
  effect: e,
  orphan,
  onPress,
}: {
  effect: Effect;
  orphan: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();

  const targetLabel = targetLabelFor(e.target);
  const isPermanent = e.durationUnit === PERMANENT_UNIT;
  const unitLabel = TIME_UNIT_LABEL[e.durationUnit] ?? e.durationUnit;
  const valueColor = e.value > 0 ? theme.colors.primary : theme.colors.error;

  // Duration/state phrase after the target label.
  const stateText = e.expired
    ? ' · expiré'
    : isPermanent
      ? ' · Permanent'
      : ` · ${e.durationRemaining} ${unitLabel}`;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, e.expired && styles.expiredText]}>
          {e.label.trim() || targetLabel}
        </Text>
        <Text style={[styles.rowSub, { color: theme.colors.onSurfaceVariant }]}>
          {targetLabel}
          {stateText}
          {orphan ? ' · compétence supprimée' : ''}
        </Text>
      </View>
      {e.value !== 0 ? (
        <Text
          style={[
            styles.rowValue,
            { color: e.expired || orphan ? theme.colors.onSurfaceVariant : valueColor },
          ]}>
          {fmtSignedMod(e.value)}
        </Text>
      ) : null}
      <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

/**
 * Effect editor form, rendered in the `effect/[eid]` modal screen (mirrors
 * WeaponEditor). Edits persist live (debounced); target selection and the
 * Permanent toggle write immediately. The target is chosen from a searchable
 * list — stats first, then the character's skills — so many skills stay usable.
 */
export function EffectEditor({
  effect: e,
  skills,
  onClose,
}: {
  effect: Effect;
  skills: Skill[];
  onClose: () => void;
}) {
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  const [label, setLabel] = useDebouncedText(e.label, (t) => updateEffect(e.id, { label: t }));
  const [value, setValue] = useDebouncedText(String(e.value), (t) =>
    updateEffect(e.id, { value: parseSigned(t) }),
  );
  // Setting a positive remaining un-expires the effect (renew).
  const [amount, setAmount] = useDebouncedText(String(e.durationRemaining), (t) => {
    const n = parseSigned(t);
    updateEffect(e.id, { durationRemaining: n, ...(n > 0 ? { expired: false } : {}) });
  });

  const permanent = e.durationUnit === PERMANENT_UNIT;
  const setPermanent = (on: boolean) => {
    if (on) updateEffect(e.id, { durationUnit: PERMANENT_UNIT, durationRemaining: 0, expired: false });
    else updateEffect(e.id, { durationUnit: 'round', durationRemaining: 1, expired: false });
  };

  // Stats + this character's skills, filtered by the search box.
  const targetOptions = [
    ...EFFECT_TARGETS,
    ...skills.map((s) => ({ key: skillTarget(s.name), label: s.name })),
  ];
  const q = query.trim().toLowerCase();
  const filtered = q ? targetOptions.filter((o) => o.label.toLowerCase().includes(q)) : targetOptions;

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cet effet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteEffect(e.id);
          onClose();
        },
      },
    ]);

  return (
    <>
      <TextInput label="Nom (optionnel)" value={label} onChangeText={setLabel} mode="outlined" dense />

      <View style={styles.fieldRow}>
        <NumberField
          fieldKey="value"
          label="Valeur (+/−)"
          value={value}
          onChange={(_, t) => setValue(t)}
          signed
          style={styles.valueField}
        />
        {permanent ? null : (
          <NumberField
            fieldKey="amount"
            label="Durée"
            value={amount}
            onChange={(_, t) => setAmount(t)}
            style={styles.valueField}
          />
        )}
      </View>

      <Checkbox.Item
        label="Permanent (toujours actif)"
        position="leading"
        status={permanent ? 'checked' : 'unchecked'}
        onPress={() => setPermanent(!permanent)}
        style={styles.checkbox}
      />

      {permanent ? null : (
        <SelectField
          label="Unité"
          options={TIME_UNITS}
          value={e.durationUnit}
          onChange={(v) => updateEffect(e.id, { durationUnit: v })}
        />
      )}

      <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
        Cible : {targetLabelFor(e.target)}
      </Text>
      <TextInput
        label="Rechercher une cible"
        value={query}
        onChangeText={setQuery}
        mode="outlined"
        dense
        left={<TextInput.Icon icon={dsIcon('search')} />}
        right={query ? <TextInput.Icon icon={dsIcon('close')} onPress={() => setQuery('')} /> : undefined}
      />
      <View style={[styles.targetList, { borderColor: theme.prophecy.borderSoft }]}>
        {filtered.length === 0 ? (
          <Text style={[styles.targetEmpty, { color: theme.colors.onSurfaceVariant }]}>
            Aucune cible.
          </Text>
        ) : (
          filtered.map((o) => {
            const selected = o.key === e.target;
            return (
              <Pressable
                key={o.key}
                style={[
                  styles.targetRow,
                  selected && { backgroundColor: theme.colors.secondaryContainer },
                ]}
                onPress={() => updateEffect(e.id, { target: o.key })}>
                <Text
                  style={{
                    color: selected ? theme.colors.primary : theme.colors.onSurface,
                    fontWeight: selected ? '700' : '400',
                  }}>
                  {o.label}
                </Text>
                {selected ? <Icon source={dsIcon('check')} size={18} color={theme.colors.primary} /> : null}
              </Pressable>
            );
          })
        )}
      </View>

      <Button mode="outlined" icon="delete" textColor={theme.colors.error} onPress={confirmDelete}>
        Supprimer
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 12 },
  expiredText: { textDecorationLine: 'line-through' },
  rowValue: { fontSize: 18, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  timeBlock: { gap: 6, marginTop: 4 },
  timeLabel: { fontSize: 12 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  fieldLabel: { fontSize: 12 },
  valueField: { flexBasis: 90, flexGrow: 0 },
  checkbox: { paddingHorizontal: 0 },
  targetList: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  targetEmpty: { padding: 12 },
});
