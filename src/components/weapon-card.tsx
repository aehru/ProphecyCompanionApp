import React, { useRef, useState } from 'react';
import { Alert, type TextInput as RNTextInput, StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SectionCard from '@/components/ui/section-card';
import type { Weapon } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formulaResult, parseFormula, parsePrerequisites } from '@/lib/formula';
import { deleteWeapon, updateWeapon } from '@/repositories/weapons';

type CaracValue = (caracKey: string) => number;

/**
 * One weapon: a read-only summary that flips to an inline editor via the pencil.
 * Formula fields (damage, ranges) show the raw formula plus its computed result
 * for this character; prerequisites are checked against the character's caracs.
 */
export default function WeaponCard({
  weapon,
  caracValue,
}: {
  weapon: Weapon;
  caracValue: CaracValue;
}) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <WeaponEditor weapon={weapon} onClose={() => setEditing(false)} />
  ) : (
    <WeaponSummary weapon={weapon} caracValue={caracValue} onEdit={() => setEditing(true)} />
  );
}

function FormulaRow({
  label,
  raw,
  caracValue,
}: {
  label: string;
  raw: string | null;
  caracValue: CaracValue;
}) {
  const theme = useProphecyTheme();
  if (raw == null || raw.trim() === '') return null;
  const result = formulaResult(raw, caracValue);
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={styles.formulaCol}>
        <Text>{raw.trim()}</Text>
        {result != null && result !== raw.trim() ? (
          <Text style={[styles.result, { color: theme.colors.primary }]}>= {result}</Text>
        ) : null}
      </View>
    </View>
  );
}

function WeaponSummary({
  weapon: w,
  caracValue,
  onEdit,
}: {
  weapon: Weapon;
  caracValue: CaracValue;
  onEdit: () => void;
}) {
  const theme = useProphecyTheme();
  const prereqs = parsePrerequisites(w.prerequisites);

  return (
    <SectionCard title={(w.name || 'Arme').toUpperCase()}>
      <IconButton icon="pencil" style={styles.editBtn} size={18} onPress={onEdit} />

      <FormulaRow label="Dégâts" raw={w.damage} caracValue={caracValue} />

      {prereqs.length > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Prérequis</Text>
          <View style={styles.prereqWrap}>
            {prereqs.map((p) => {
              const met = caracValue(p.carac) >= p.min;
              return (
                <Text
                  key={p.carac}
                  style={[styles.prereq, { color: met ? theme.colors.primary : theme.colors.error }]}>
                  {p.abbr} {p.min}
                </Text>
              );
            })}
          </View>
        </View>
      ) : null}

      <FormulaRow label="Portée eff." raw={w.rangeEffective} caracValue={caracValue} />
      <FormulaRow label="Portée max" raw={w.rangeMax} caracValue={caracValue} />

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Initiative</Text>
        <Text style={styles.value}>
          Mêlée {fmtSigned(w.initMelee)} · CàC {fmtSigned(w.initCorpsACorps)}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Création</Text>
        <Text style={styles.value}>
          Diff. {w.creationDifficulty} · Temps {w.creationTime}
        </Text>
      </View>

      {w.special.trim() !== '' ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Spécial</Text>
          <Text style={styles.value}>{w.special.trim()}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
}

function fmtSigned(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

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

/** Inline editor. Edits persist live (debounced) like the armor editor. */
function WeaponEditor({ weapon: w, onClose }: { weapon: Weapon; onClose: () => void }) {
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

  const damageErr = formulaError(damage);
  const rangeEffErr = formulaError(rangeEff);
  const rangeMaxErr = formulaError(rangeMax);

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cette arme ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteWeapon(w.id) },
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
    <SectionCard title="MODIFIER">
      <IconButton icon="check" style={styles.editBtn} size={18} onPress={onClose} />

      <TextInput
        label="Nom"
        value={name}
        onChangeText={setName}
        mode="outlined"
        dense
        {...textChain('name')}
      />

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
          value={w.creationTime ? String(w.creationTime) : ''}
          onChange={(_, t) => updateWeapon(w.id, { creationTime: Number(t) || 0 })}
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
    </SectionCard>
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
  editBtn: { position: 'absolute', top: 0, right: 0, margin: 2, zIndex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 92, fontSize: 14 },
  value: { flex: 1, fontSize: 15 },
  formulaCol: { flex: 1 },
  result: { fontSize: 15, fontWeight: '700' },
  prereqWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prereq: { fontSize: 15, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  numCol: { flexGrow: 1, flexBasis: 120, minWidth: 120 },
  special: { minHeight: 72 },
});
