import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import type { Shield } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useFieldChain } from '@/hooks/use-field-chain';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formatDecimal, parseDecimal } from '@/lib/character-values';
import { parseFormula } from '@/lib/formula';
import { deleteShield, updateShield } from '@/repositories/shields';

// Split out of shield-card.tsx: the read-only card and this editor form share
// nothing but the Shield type, and only the `shield/[sid]` modal loads this
// one. Mirrors weapon-editor.tsx (a shield deals damage like a weapon) plus
// the defense/encombrement fields from armor-editor.tsx.

const EDIT_ORDER = [
  'name',
  'damage',
  'prereq',
  'creationDifficulty',
  'creationTime',
  'defenseMax',
  'encombrement',
] as const;

/**
 * Shield editor form, rendered in the `shield/[sid]` modal screen. Edits
 * persist live (debounced); `onClose` returns after a delete.
 */
export default function ShieldEditor({
  shield: s,
  onClose,
}: {
  shield: Shield;
  onClose: () => void;
}) {
  const theme = useProphecyTheme();
  const [name, setName] = useDebouncedText(s.name, (t) => updateShield(s.id, { name: t }));
  const [damage, setDamage] = useDebouncedText(s.damage, (t) => updateShield(s.id, { damage: t }));
  const [prereq, setPrereq] = useDebouncedText(s.prerequisites, (t) =>
    updateShield(s.id, { prerequisites: t }),
  );
  const [special, setSpecial] = useDebouncedText(s.special, (t) => updateShield(s.id, { special: t }));
  const [creationTime, setCreationTime] = useState(
    s.creationTime ? formatDecimal(s.creationTime) : '',
  );

  const damageErr = formulaError(damage);

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer ce bouclier ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteShield(s.id);
          onClose();
        },
      },
    ]);

  // Keyboard "next" wiring: jump to the following field instead of dismissing.
  const { textChain, numChain } = useFieldChain(EDIT_ORDER);

  return (
    <>
      <TextInput
        label="Nom"
        value={name}
        onChangeText={setName}
        mode="outlined"
        dense
        {...textChain('name')}
      />

      <TextInput
        label="Dégâts (ex. FOR +3)"
        value={damage}
        onChangeText={setDamage}
        mode="outlined"
        dense
        autoCapitalize="characters"
        error={!!damageErr}
        {...textChain('damage')}
      />
      {damageErr ? (
        <HelperText type="error" visible>
          {damageErr}
        </HelperText>
      ) : null}

      <TextInput
        label="Prérequis (ex. FOR 4, COO 5)"
        value={prereq}
        onChangeText={setPrereq}
        mode="outlined"
        dense
        autoCapitalize="characters"
        {...textChain('prereq')}
      />

      <View style={styles.grid}>
        <NumberField
          fieldKey="creationDifficulty"
          label="Difficulté création"
          value={s.creationDifficulty ? String(s.creationDifficulty) : ''}
          onChange={(_, t) => updateShield(s.id, { creationDifficulty: Number(t) || 0 })}
          style={styles.numCol}
          {...numChain('creationDifficulty')}
        />
        <NumberField
          fieldKey="creationTime"
          label="Temps création"
          value={creationTime}
          onChange={(_, t) => {
            setCreationTime(t);
            updateShield(s.id, { creationTime: parseDecimal(t) });
          }}
          decimal
          style={styles.numCol}
          {...numChain('creationTime')}
        />
        <NumberField
          fieldKey="defenseMax"
          label="Défense max"
          value={s.defenseMax ? String(s.defenseMax) : ''}
          onChange={(_, t) => {
            const max = Number(t) || 0;
            const full = s.defenseCurrent >= s.defenseMax;
            updateShield(s.id, {
              defenseMax: max,
              defenseCurrent: full ? max : Math.min(s.defenseCurrent, max),
            });
          }}
          style={styles.numCol}
          {...numChain('defenseMax')}
        />
        <NumberField
          fieldKey="encombrement"
          label="Pénalité d'encombrement"
          value={s.encombrementMalus ? String(s.encombrementMalus) : ''}
          onChange={(_, t) => updateShield(s.id, { encombrementMalus: Number(t) || 0 })}
          style={styles.numCol}
          {...numChain('encombrement', true)}
        />
      </View>

      <TextInput
        label="Spécial (autres effets)"
        value={special}
        onChangeText={setSpecial}
        mode="outlined"
        multiline
        style={styles.special}
      />

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="delete"
          textColor={theme.colors.error}
          onPress={confirmDelete}
          style={styles.actionBtn}>
          Supprimer
        </Button>
        <Button
          mode="contained-tonal"
          icon="hammer-wrench"
          onPress={() => updateShield(s.id, { defenseCurrent: s.defenseMax })}
          style={styles.actionBtn}>
          Réparer
        </Button>
      </View>
    </>
  );
}

/** Validation message for a formula field (null = valid/empty). */
function formulaError(raw: string): string | null {
  const res = parseFormula(raw);
  return res.ok ? null : res.error;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  numCol: { flexGrow: 1, flexBasis: 120, minWidth: 120 },
  special: { minHeight: 72 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
});
