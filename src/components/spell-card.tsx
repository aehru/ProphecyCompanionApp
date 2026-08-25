import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, HelperText, Switch, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SpellDetail from '@/components/spell-detail';
import ChipSelect, { ChipMultiSelect } from '@/components/ui/chip-select';
import Icon from '@/components/ui/icon';
import SelectField from '@/components/ui/select-field';
import {
  CLE_PARFAITE_BONUS,
  DISCIPLINE_LABEL,
  DISCIPLINES,
  SPELL_TAGS,
  SPHERE_LABEL,
  SPHERES,
  TIME_UNITS,
} from '@/constants/prophecy';
import type { Spell } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import TotalBadge from '@/components/ui/total-badge';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { parseFormula } from '@/lib/formula';
import type { SpellTotal } from '@/lib/spell-total';
import { deleteSpell, updateSpell } from '@/repositories/spells';

/** Validation message for a spell formula field (null = valid or empty). */
function spellFormulaError(raw: string): string | null {
  const res = parseFormula(raw, { nr: true, sphere: true });
  return res.ok ? null : res.error;
}

/**
 * One spell: a read-only summary that opens the editor in a modal (`spell/[sid]`)
 * via the pencil — mirrors WeaponCard. Spells are always "known" (no equip).
 * `total` is this character's casting score (see lib/spell-total): shown as a
 * badge on the collapsed row, then broken down in the detail.
 */
export default function SpellCard({
  spell,
  total,
  caracValue,
}: {
  spell: Spell;
  total?: SpellTotal | null;
  /** Passed through to the detail — resolves a durée written against a stat. */
  caracValue?: (caracKey: string) => number;
}) {
  const router = useRouter();
  return (
    <SpellSummary
      spell={spell}
      total={total}
      caracValue={caracValue}
      onEdit={() => router.push(`/character/${spell.characterId}/spell/${spell.id}`)}
    />
  );
}

function SpellSummary({
  spell: s,
  total,
  caracValue,
  onEdit,
}: {
  spell: Spell;
  total?: SpellTotal | null;
  caracValue?: (caracKey: string) => number;
  onEdit: () => void;
}) {
  const theme = useProphecyTheme();
  const [expanded, setExpanded] = useState(false);

  const subtitle = [`Niv. ${s.level}`, DISCIPLINE_LABEL[s.discipline], SPHERE_LABEL[s.sphere]]
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
          <Icon name="magic" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.itemMain}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {s.name || 'Sortilège'}
            </Text>
            {s.cleParfaite ? (
              <View
                accessibilityLabel={`Clé parfaite, +${CLE_PARFAITE_BONUS} à l'incantation`}
                style={styles.keyBadge}>
                <Icon name="key" size={16} color={theme.colors.primary} />
              </View>
            ) : null}
          </View>
          {subtitle !== '' ? (
            <Text
              style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {total ? (
          <TotalBadge
            value={total.total}
            accessibilityLabel={`Total d'incantation ${total.total}`}
          />
        ) : null}
        <Icon name={expanded ? 'arrowup' : 'chev'} size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {expanded ? (
        <SpellDetail spell={s} total={total} caracValue={caracValue} onEdit={onEdit} />
      ) : null}
    </View>
  );
}

/**
 * Spell editor form, rendered in the `spell/[sid]` modal. Edits persist live
 * (debounced text; enum/number fields write immediately) like the weapon editor;
 * `onClose` returns after a delete.
 */
export function SpellEditor({ spell: s, onClose }: { spell: Spell; onClose: () => void }) {
  const theme = useProphecyTheme();
  const [name, setName] = useDebouncedText(s.name, (t) => updateSpell(s.id, { name: t }));
  const [cle, setCle] = useDebouncedText(s.cle, (t) => updateSpell(s.id, { cle: t }));
  const [effect, setEffect] = useDebouncedText(s.effect, (t) => updateSpell(s.id, { effect: t }));
  const [inGameEffect, setInGameEffect] = useDebouncedText(s.inGameEffect, (t) =>
    updateSpell(s.id, { inGameEffect: t }),
  );
  const [sensoryEffect, setSensoryEffect] = useDebouncedText(s.sensoryEffect, (t) =>
    updateSpell(s.id, { sensoryEffect: t }),
  );
  const [duration, setDuration] = useDebouncedText(s.duration, (t) =>
    updateSpell(s.id, { duration: t }),
  );
  const [targets, setTargets] = useDebouncedText(s.targets, (t) =>
    updateSpell(s.id, { targets: t }),
  );

  // Same parser, same opt-ins as the catalogue build (scripts/build-catalogs).
  const durationErr = spellFormulaError(duration);
  const targetsErr = spellFormulaError(targets);

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer ce sortilège ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteSpell(s.id);
          onClose();
        },
      },
    ]);

  return (
    <>
      <TextInput label="Nom" value={name} onChangeText={setName} mode="outlined" dense />

      <ChipSelect
        label="Discipline"
        options={DISCIPLINES}
        value={s.discipline}
        onChange={(k) => updateSpell(s.id, { discipline: k as Spell['discipline'] })}
      />

      <ChipSelect
        label="Sphère"
        options={SPHERES}
        value={s.sphere}
        onChange={(k) => updateSpell(s.id, { sphere: k as Spell['sphere'] })}
      />

      <View style={styles.grid}>
        <NumberField
          fieldKey="level"
          label="Niveau"
          value={s.level ? String(s.level) : ''}
          onChange={(_, t) => updateSpell(s.id, { level: Number(t) || 0 })}
          style={styles.numCol}
        />
        <NumberField
          fieldKey="complexity"
          label="Complexité"
          value={s.complexity ? String(s.complexity) : ''}
          onChange={(_, t) => updateSpell(s.id, { complexity: Number(t) || 0 })}
          style={styles.numCol}
        />
        <NumberField
          fieldKey="cost"
          label="Coût"
          value={s.cost ? String(s.cost) : ''}
          onChange={(_, t) => updateSpell(s.id, { cost: Number(t) || 0 })}
          style={styles.numCol}
        />
        <NumberField
          fieldKey="difficulty"
          label="Difficulté"
          value={s.difficulty ? String(s.difficulty) : ''}
          onChange={(_, t) => updateSpell(s.id, { difficulty: Number(t) || 0 })}
          style={styles.numCol}
        />
      </View>

      {/* Amount + unit read as one value ("3 Tours"), so they share one title
          and one row instead of a labelled field plus a separate chip row. */}
      <View>
        <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
          Temps d&apos;incantation
        </Text>
        <View style={styles.castRow}>
          <NumberField
            fieldKey="castTimeAmount"
            value={s.castTimeAmount ? String(s.castTimeAmount) : ''}
            onChange={(_, t) => updateSpell(s.id, { castTimeAmount: Number(t) || 0 })}
            style={styles.castAmount}
          />
          <SelectField
            options={TIME_UNITS}
            value={s.castTimeUnit}
            onChange={(k) => updateSpell(s.id, { castTimeUnit: k as Spell['castTimeUnit'] })}
            style={styles.castUnit}
          />
        </View>
      </View>

      <TextInput label="Clé" value={cle} onChangeText={setCle} mode="outlined" dense />

      {/* Crafted / used up — flipped in play, so it writes immediately. */}
      <View style={styles.switchRow}>
        <View style={styles.switchMain}>
          <Text style={styles.switchLabel}>Clé parfaite</Text>
          <Text style={[styles.switchHint, { color: theme.colors.onSurfaceVariant }]}>
            {`+${CLE_PARFAITE_BONUS} à l'incantation (difficulté −${CLE_PARFAITE_BONUS})`}
          </Text>
        </View>
        <Switch
          value={s.cleParfaite}
          onValueChange={(v) => updateSpell(s.id, { cleParfaite: v })}
        />
      </View>

      <TextInput
        label="Effet"
        value={effect}
        onChangeText={setEffect}
        mode="outlined"
        multiline
        style={styles.effect}
      />

      {/* Durée and cibles accept the rulebook's own wording — « 1 + NR », « 30 +
          30 par NR », « SPHERE x2 » — so a spell can be typed straight off the
          page. Validated against the same parser the catalogue build runs, or
          the two authoring surfaces would disagree on what counts as a formula.
          Amount + unit share one title, exactly like the cast time above. */}
      <View>
        <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>Durée</Text>
        <View style={styles.castRow}>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="1 + NR"
            mode="outlined"
            dense
            error={!!durationErr}
            style={styles.formulaField}
          />
          <SelectField
            options={TIME_UNITS}
            value={s.durationUnit}
            onChange={(k) => updateSpell(s.id, { durationUnit: k as Spell['durationUnit'] })}
            style={styles.castUnit}
          />
        </View>
      </View>
      {durationErr ? (
        <HelperText type="error" visible>
          {durationErr}
        </HelperText>
      ) : null}

      <TextInput
        label="Cibles"
        value={targets}
        onChangeText={setTargets}
        placeholder="1 + NR"
        mode="outlined"
        dense
        error={!!targetsErr}
      />
      {targetsErr ? (
        <HelperText type="error" visible>
          {targetsErr}
        </HelperText>
      ) : null}

      <TextInput
        label="Effet de jeu"
        value={inGameEffect}
        onChangeText={setInGameEffect}
        mode="outlined"
        multiline
        style={styles.effect}
      />

      <TextInput
        label="Ce que l'on perçoit"
        value={sensoryEffect}
        onChangeText={setSensoryEffect}
        mode="outlined"
        multiline
        style={styles.effect}
      />

      <ChipMultiSelect
        label="Tags"
        options={SPELL_TAGS}
        values={s.tags}
        onChange={(next) => updateSpell(s.id, { tags: next })}
      />

      <Button mode="outlined" icon="delete" textColor={theme.colors.error} onPress={confirmDelete}>
        Supprimer
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  // DS inventory row (shared shape with weapon/armor cards).
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  keyBadge: { alignItems: 'center', justifyContent: 'center' },
  itemSub: { fontSize: 12, marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  numCol: { flexGrow: 1, flexBasis: 120, minWidth: 120 },
  fieldLabel: { fontSize: 12, marginBottom: 2 },
  castRow: { flexDirection: 'row', gap: 12 },
  castAmount: { flexGrow: 0, flexBasis: 90 },
  castUnit: { flexGrow: 1, flexBasis: 120 },
  // Wider than `castAmount`: this one holds a formula ("30 + 30 par NR"), not a
  // two-digit count.
  formulaField: { flexGrow: 1, flexBasis: 150 },
  effect: { minHeight: 72 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchMain: { flex: 1, minWidth: 0 },
  switchLabel: { fontSize: 15 },
  switchHint: { fontSize: 12, marginTop: 1 },
});
