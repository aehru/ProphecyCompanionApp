import React, { useRef, useState } from 'react';
import { Alert, Pressable, type TextInput as RNTextInput, StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import Icon, { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import type { Weapon } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formulaResult, parseFormula, parsePrerequisites } from '@/lib/formula';
import { fmtSignedMod } from '@/lib/modifiers';
import { deleteWeapon, updateWeapon } from '@/repositories/weapons';

type CaracValue = (caracKey: string) => number;
/**
 * Net wound + temporary-effect modifier for a caractéristique. Folded into the
 * carac value before any multiplier in the damage formula.
 */
type CaracModifier = (caracKey: string) => number;

/**
 * One weapon: a read-only summary that flips to an inline editor via the pencil.
 * Formula fields (damage, ranges) show the raw formula plus its computed result
 * for this character; prerequisites are checked against the character's caracs.
 */
export default function WeaponCard({
  weapon,
  caracValue,
  caracModifier,
}: {
  weapon: Weapon;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
}) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <WeaponEditor weapon={weapon} onClose={() => setEditing(false)} />
  ) : (
    <WeaponSummary
      weapon={weapon}
      caracValue={caracValue}
      caracModifier={caracModifier}
      onEdit={() => setEditing(true)}
    />
  );
}

function FormulaRow({
  label,
  raw,
  caracValue,
  // Per-carac modifier (wound + effects), folded into carac values before the
  // multiplier. Only the damage row passes this; ranges ignore combat maluses.
  caracModifier,
}: {
  label: string;
  raw: string | null;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
}) {
  const theme = useProphecyTheme();
  if (raw == null || raw.trim() === '') return null;
  const result = formulaResult(raw, caracValue, caracModifier);
  // Badge = the raw carac modifier (wound + effects), shown BEFORE any multiplier:
  // a +2 on `FOR x2` reads "+2", not "+4".
  const delta = formulaCaracMod(raw, caracModifier);
  const modColor = delta > 0 ? theme.colors.primary : theme.colors.error;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={styles.formulaCol}>
        <Text>{raw.trim()}</Text>
        {result != null && result !== raw.trim() ? (
          <View style={styles.resultRow}>
            <Text style={[styles.result, { color: theme.colors.primary }]}>= {result}</Text>
            {delta !== 0 ? (
              <>
                <IconButton
                  icon="alert-circle"
                  size={14}
                  iconColor={modColor}
                  style={styles.modIcon}
                />
                <Text style={[styles.modNote, { color: modColor }]}>
                  ({fmtSignedMod(delta)})
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Sum of the raw carac modifiers for the distinct caractéristiques a formula
 * uses — the value applied to each carac before its multiplier. For a single-carac
 * formula (the common case) this is just that carac's modifier.
 */
function formulaCaracMod(raw: string, caracModifier?: CaracModifier): number {
  if (!caracModifier) return 0;
  const parsed = parseFormula(raw);
  if (!parsed.ok) return 0;
  const keys = new Set<string>();
  for (const t of parsed.formula.terms) if (t.kind === 'carac') keys.add(t.carac);
  let total = 0;
  for (const k of keys) total += caracModifier(k);
  return total;
}

function WeaponSummary({
  weapon: w,
  caracValue,
  caracModifier,
  onEdit,
}: {
  weapon: Weapon;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
  onEdit: () => void;
}) {
  const theme = useProphecyTheme();
  const [expanded, setExpanded] = useState(false);
  const prereqs = parsePrerequisites(w.prerequisites);

  // Collapsed-row subtitle: computed damage + initiative (mêlée / corps à corps).
  // The full breakdown (formula results, prereqs, ranges, creation) is in the
  // expanded detail.
  const dmg = formulaResult(w.damage, caracValue, caracModifier);
  const subtitle = [
    w.damage.trim() !== '' ? `Dégâts ${dmg ?? w.damage.trim()}` : null,
    `Init ${fmtSigned(w.initMelee)}/${fmtSigned(w.initCorpsACorps)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.item, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Pressable style={styles.itemRow} onPress={() => setExpanded((e) => !e)}>
        <View
          style={[
            styles.tile,
            { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft },
          ]}>
          <Icon name="sword" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.itemMain}>
          <Text style={styles.itemName} numberOfLines={1}>
            {w.name || 'Arme'}
          </Text>
          {subtitle !== '' ? (
            <Text
              style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Icon name={expanded ? 'arrowup' : 'chev'} size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {expanded ? (
        <View style={styles.detail}>
          <FormulaRow
            label="Dégâts"
            raw={w.damage}
            caracValue={caracValue}
            caracModifier={caracModifier}
          />

          {prereqs.length > 0 ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Prérequis</Text>
              <View style={styles.prereqWrap}>
                {prereqs.map((p) => {
                  const met = caracValue(p.carac) >= p.min;
                  return (
                    <Text
                      key={p.carac}
                      style={[
                        styles.prereq,
                        { color: met ? theme.colors.primary : theme.colors.error },
                      ]}>
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

          <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
            Modifier
          </Button>
        </View>
      ) : null}
    </View>
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
      <IconButton icon={dsIcon('check')} style={styles.editBtn} size={18} onPress={onClose} />

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
  // DS inventory row.
  item: { borderBottomWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMain: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 1 },
  detail: { gap: 8, paddingLeft: 2, paddingBottom: 12 },
  detailEdit: { alignSelf: 'flex-start', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 92, fontSize: 14 },
  value: { flex: 1, fontSize: 15 },
  formulaCol: { flex: 1 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  result: { fontSize: 15, fontWeight: '700' },
  modIcon: { margin: 0 },
  modNote: { fontSize: 13, fontWeight: '700' },
  prereqWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prereq: { fontSize: 15, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  numCol: { flexGrow: 1, flexBasis: 120, minWidth: 120 },
  special: { minHeight: 72 },
});
