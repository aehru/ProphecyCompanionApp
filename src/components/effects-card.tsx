import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Menu, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SectionCard from '@/components/ui/section-card';
import {
  EFFECT_TARGET_LABEL,
  EFFECT_TARGETS,
  EFFECT_UNIT_LABEL,
  EFFECT_UNITS,
} from '@/constants/prophecy';
import type { Effect } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fmtSignedMod } from '@/lib/modifiers';
import { createEffect, deleteEffect, tickUnit, updateEffect } from '@/repositories/effects';

/**
 * Temporary bonuses/maluses for the résumé tab. Read view lists each effect with
 * its signed value and remaining duration; edit view (driven by the tab toggle)
 * adds inline editors, a delete per row, an "add" button, and per-unit "time
 * passes" controls that tick a single unit's effects down by 1.
 */
export default function EffectsCard({
  characterId,
  effects,
  editing,
}: {
  characterId: number;
  effects: Effect[];
  editing: boolean;
}) {
  const theme = useProphecyTheme();

  // Units that still have at least one active effect — the only ones worth
  // offering a "time passes" button for.
  const liveUnits = EFFECT_UNITS.filter((u) =>
    effects.some((e) => !e.expired && e.durationUnit === u.key),
  );

  return (
    <SectionCard title="EFFETS">
      {effects.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {editing ? 'Aucun effet. Ajoutez-en un ci-dessous.' : 'Aucun effet temporaire.'}
        </Text>
      ) : (
        effects.map((e) => (
          <EffectRow key={e.id} effect={e} editing={editing} />
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
                onPress={() => tickUnit(characterId, u.key)}>
                {u.label} −1
              </Button>
            ))}
          </View>
        </View>
      ) : null}

      {editing ? (
        <Button
          mode="contained-tonal"
          icon="plus"
          onPress={() =>
            createEffect(characterId, {
              target: 'all',
              value: 0,
              durationUnit: 'round',
              durationRemaining: 1,
            })
          }>
          Ajouter un effet
        </Button>
      ) : null}
    </SectionCard>
  );
}

function parseSigned(t: string) {
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? 0 : n;
}

function EffectRow({ effect: e, editing }: { effect: Effect; editing: boolean }) {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState(false);

  if (editing && open) return <EffectEditor effect={e} onClose={() => setOpen(false)} />;

  const targetLabel = EFFECT_TARGET_LABEL[e.target] ?? e.target;
  const unitLabel = EFFECT_UNIT_LABEL[e.durationUnit] ?? e.durationUnit;
  const valueColor = e.value > 0 ? theme.colors.primary : theme.colors.error;

  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, e.expired && styles.expiredText]}>
          {e.label.trim() || targetLabel}
        </Text>
        <Text style={[styles.rowSub, { color: theme.colors.onSurfaceVariant }]}>
          {targetLabel}
          {e.expired ? ' · expiré' : ` · ${e.durationRemaining} ${unitLabel}`}
        </Text>
      </View>
      {e.value !== 0 ? (
        <Text style={[styles.rowValue, { color: e.expired ? theme.colors.onSurfaceVariant : valueColor }]}>
          {fmtSignedMod(e.value)}
        </Text>
      ) : null}
      {editing ? (
        <>
          <IconButton icon="pencil" size={18} onPress={() => setOpen(true)} />
          <IconButton
            icon="delete"
            size={18}
            iconColor={theme.colors.error}
            onPress={() => deleteEffect(e.id)}
          />
        </>
      ) : null}
    </View>
  );
}

function EffectEditor({ effect: e, onClose }: { effect: Effect; onClose: () => void }) {
  const theme = useProphecyTheme();
  const [targetMenu, setTargetMenu] = useState(false);
  const [label, setLabel] = useDebouncedText(e.label, (t) => updateEffect(e.id, { label: t }));
  const [value, setValue] = useDebouncedText(String(e.value), (t) =>
    updateEffect(e.id, { value: parseSigned(t) }),
  );
  // Setting a positive remaining un-expires the effect (renew); 0 keeps it as-is.
  const [amount, setAmount] = useDebouncedText(String(e.durationRemaining), (t) => {
    const n = parseSigned(t);
    updateEffect(e.id, { durationRemaining: n, ...(n > 0 ? { expired: false } : {}) });
  });

  const targetLabel = EFFECT_TARGET_LABEL[e.target] ?? e.target;

  return (
    <View style={[styles.editor, { borderColor: theme.prophecy.borderSoft }]}>
      <View style={styles.editorHeader}>
        <Text style={[styles.editorTitle, { color: theme.colors.primary }]}>Effet</Text>
        <IconButton icon="check" size={18} onPress={onClose} />
      </View>

      <TextInput
        label="Nom (optionnel)"
        value={label}
        onChangeText={setLabel}
        mode="outlined"
        dense
      />

      <View style={styles.fieldRow}>
        <View style={styles.targetCol}>
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>Cible</Text>
          <Menu
            visible={targetMenu}
            onDismiss={() => setTargetMenu(false)}
            anchor={
              <Button mode="outlined" onPress={() => setTargetMenu(true)} icon="target">
                {targetLabel}
              </Button>
            }>
            {EFFECT_TARGETS.map((t) => (
              <Menu.Item
                key={t.key}
                title={t.label}
                onPress={() => {
                  updateEffect(e.id, { target: t.key });
                  setTargetMenu(false);
                }}
              />
            ))}
          </Menu>
        </View>
        <NumberField
          fieldKey="value"
          label="Valeur (+/−)"
          value={value}
          onChange={(_, t) => setValue(t)}
          signed
          style={styles.valueField}
        />
        <NumberField
          fieldKey="amount"
          label="Durée"
          value={amount}
          onChange={(_, t) => setAmount(t)}
          style={styles.valueField}
        />
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>Unité</Text>
      <SegmentedButtons
        value={e.durationUnit}
        onValueChange={(v) => updateEffect(e.id, { durationUnit: v })}
        buttons={EFFECT_UNITS.map((u) => ({ value: u.key, label: u.label }))}
      />

      <Button
        mode="outlined"
        icon="delete"
        textColor={theme.colors.error}
        onPress={() => deleteEffect(e.id)}>
        Supprimer
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 12 },
  expiredText: { textDecorationLine: 'line-through' },
  rowValue: { fontSize: 18, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  timeBlock: { gap: 6, marginTop: 4 },
  timeLabel: { fontSize: 12 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  editor: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 8 },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editorTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  targetCol: { gap: 2 },
  fieldLabel: { fontSize: 12 },
  valueField: { flexBasis: 90, flexGrow: 0 },
});
