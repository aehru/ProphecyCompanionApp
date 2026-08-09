import React, { useRef, useState } from 'react';
import { Alert, type TextInput as RNTextInput, StyleSheet, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import WeaponSkillField from '@/components/weapon-skill-field';
import type { Weapon } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formatDecimal, parseDecimal } from '@/lib/character-values';
import { parseFormula } from '@/lib/formula';
import { deleteWeapon, updateWeapon } from '@/repositories/weapons';

// Split out of weapon-card.tsx: the read-only card and this editor form share
// nothing but the Weapon type, and only the `weapon/[wid]` modal loads this one.

// Field tab order for the keyboard "next" chaining. The multiline "special"
// field is intentionally excluded (it's the trailing free-text box).
const EDIT_ORDER = [
  'name',
  'damage',
  'prereq',
  'rangeEff',
  'rangeMax',
  'initMelee',
  'initCac',
  'creationDifficulty',
  'creationTime',
] as const;

/**
 * Weapon editor form, rendered in the `weapon/[wid]` modal screen. Edits persist
 * live (debounced) like the armor editor; `onClose` returns after a delete.
 */
export default function WeaponEditor({
  weapon: w,
  onClose,
}: {
  weapon: Weapon;
  onClose: () => void;
}) {
  const theme = useProphecyTheme();
  const [name, setName] = useDebouncedText(w.name, (t) => updateWeapon(w.id, { name: t }));
  const [damage, setDamage] = useDebouncedText(w.damage, (t) => updateWeapon(w.id, { damage: t }));
  const [prereq, setPrereq] = useDebouncedText(w.prerequisites, (t) =>
    updateWeapon(w.id, { prerequisites: t }),
  );
  const [rangeEff, setRangeEff] = useDebouncedText(w.rangeEffective ?? '', (t) =>
    updateWeapon(w.id, { rangeEffective: t.trim() === '' ? null : t }),
  );
  const [rangeMax, setRangeMax] = useDebouncedText(w.rangeMax ?? '', (t) =>
    updateWeapon(w.id, { rangeMax: t.trim() === '' ? null : t }),
  );
  const [special, setSpecial] = useDebouncedText(w.special, (t) =>
    updateWeapon(w.id, { special: t }),
  );
  const [initMelee, setInitMelee] = useDebouncedText(String(w.initMelee), (t) =>
    updateWeapon(w.id, { initMelee: parseSigned(t) }),
  );
  const [initCac, setInitCac] = useDebouncedText(String(w.initCorpsACorps), (t) =>
    updateWeapon(w.id, { initCorpsACorps: parseSigned(t) }),
  );
  // Creation time is the one fractional field (0,5 jour). Its text is kept local
  // instead of read back off the row: `0,` parses to 0 and would render back as
  // "0", eating the separator the user just typed. Nothing else writes the row
  // while this modal is open, so a one-way field is safe.
  const [creationTime, setCreationTime] = useState(
    w.creationTime ? formatDecimal(w.creationTime) : '',
  );

  const damageErr = formulaError(damage);
  const rangeEffErr = formulaError(rangeEff);
  const rangeMaxErr = formulaError(rangeMax);

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cette arme ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteWeapon(w.id);
          onClose();
        },
      },
    ]);

  // Keyboard "next" wiring: jump to the following field instead of dismissing.
  const refs = useRef<Record<string, RNTextInput | null>>({});
  const focusNext = (key: string) => {
    const next = EDIT_ORDER[EDIT_ORDER.indexOf(key as (typeof EDIT_ORDER)[number]) + 1];
    refs.current[next]?.focus();
  };
  const setPaperRef = (key: string) => (el: unknown) => {
    refs.current[key] = el as RNTextInput | null;
  };
  // Single-line text fields: chain to the next field on return.
  const textChain = (key: string) => ({
    ref: setPaperRef(key),
    returnKeyType: 'next' as const,
    blurOnSubmit: false,
    onSubmitEditing: () => focusNext(key),
  });
  // NumberField fields: same, via its inputRef passthrough.
  const numChain = (key: string, last = false) => ({
    inputRef: (el: RNTextInput | null) => {
      refs.current[key] = el;
    },
    returnKeyType: (last ? 'done' : 'next') as 'done' | 'next',
    submitBehavior: (last ? 'blurAndSubmit' : 'submit') as 'blurAndSubmit' | 'submit',
    onSubmitEditing: () => focusNext(key),
  });

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

      {/* Right under the name: which compétence this weapon is used with is
          part of what it IS, not a stat detail. Outside the keyboard chain —
          it's a dialog, not a field. */}
      <WeaponSkillField weapon={w} />

      <TextInput
        label="Dégâts (ex. FOR x2 +3 +1D10)"
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

      <TextInput
        label="Portée efficace (vide = mêlée)"
        value={rangeEff}
        onChangeText={setRangeEff}
        mode="outlined"
        dense
        autoCapitalize="characters"
        error={!!rangeEffErr}
        {...textChain('rangeEff')}
      />
      {rangeEffErr ? (
        <HelperText type="error" visible>
          {rangeEffErr}
        </HelperText>
      ) : null}

      <TextInput
        label="Portée max (vide = mêlée)"
        value={rangeMax}
        onChangeText={setRangeMax}
        mode="outlined"
        dense
        autoCapitalize="characters"
        error={!!rangeMaxErr}
        {...textChain('rangeMax')}
      />
      {rangeMaxErr ? (
        <HelperText type="error" visible>
          {rangeMaxErr}
        </HelperText>
      ) : null}

      <View style={styles.grid}>
        <NumberField
          fieldKey="initMelee"
          label="Init. mêlée"
          value={initMelee}
          onChange={(_, t) => setInitMelee(t)}
          signed
          style={styles.numCol}
          {...numChain('initMelee')}
        />
        <NumberField
          fieldKey="initCac"
          label="Init. corps à corps"
          value={initCac}
          onChange={(_, t) => setInitCac(t)}
          signed
          style={styles.numCol}
          {...numChain('initCac')}
        />
        <NumberField
          fieldKey="creationDifficulty"
          label="Difficulté création"
          value={w.creationDifficulty ? String(w.creationDifficulty) : ''}
          onChange={(_, t) => updateWeapon(w.id, { creationDifficulty: Number(t) || 0 })}
          style={styles.numCol}
          {...numChain('creationDifficulty')}
        />
        <NumberField
          fieldKey="creationTime"
          label="Temps création"
          value={creationTime}
          onChange={(_, t) => {
            setCreationTime(t);
            updateWeapon(w.id, { creationTime: parseDecimal(t) });
          }}
          decimal
          style={styles.numCol}
          {...numChain('creationTime', true)}
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

      <Button mode="outlined" icon="delete" textColor={theme.colors.error} onPress={confirmDelete}>
        Supprimer
      </Button>
    </>
  );
}

function parseSigned(t: string) {
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? 0 : n;
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
});
