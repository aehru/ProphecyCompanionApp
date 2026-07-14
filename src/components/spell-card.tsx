import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import ChipSelect from '@/components/ui/chip-select';
import Icon, { dsIcon } from '@/components/ui/icon';
import {
  DISCIPLINE_LABEL,
  DISCIPLINES,
  EFFECT_UNIT_LABEL,
  EFFECT_UNITS,
  SPHERE_LABEL,
  SPHERES,
} from '@/constants/prophecy';
import type { Spell } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { deleteSpell, updateSpell } from '@/repositories/spells';

/**
 * One spell: a read-only summary that opens the editor in a modal (`spell/[sid]`)
 * via the pencil — mirrors WeaponCard. Spells are always "known" (no equip).
 */
export default function SpellCard({ spell }: { spell: Spell }) {
  const router = useRouter();
  return (
    <SpellSummary
      spell={spell}
      onEdit={() => router.push(`/character/${spell.characterId}/spell/${spell.id}`)}
    />
  );
}

function SpellSummary({ spell: s, onEdit }: { spell: Spell; onEdit: () => void }) {
  const theme = useProphecyTheme();
  const [expanded, setExpanded] = useState(false);

  const subtitle = [DISCIPLINE_LABEL[s.discipline], SPHERE_LABEL[s.sphere]]
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
          <Text style={styles.itemName} numberOfLines={1}>
            {s.name || 'Sortilège'}
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
          <DetailRow label="Complexité" value={String(s.complexity)} />
          <DetailRow label="Sphère" value={SPHERE_LABEL[s.sphere] ?? s.sphere} />
          <DetailRow label="Coût" value={String(s.cost)} />
          <DetailRow
            label="Incantation"
            value={`${s.castTimeAmount} ${EFFECT_UNIT_LABEL[s.castTimeUnit] ?? s.castTimeUnit}`}
          />
          <DetailRow label="Difficulté" value={String(s.difficulty)} />
          {s.cle.trim() !== '' ? <DetailRow label="Clé" value={s.cle.trim()} /> : null}
          {s.effect.trim() !== '' ? <DetailRow label="Effet" value={s.effect.trim()} /> : null}

          <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
            Modifier
          </Button>
        </View>
      ) : null}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
        <NumberField
          fieldKey="castTimeAmount"
          label="Temps d'incantation"
          value={s.castTimeAmount ? String(s.castTimeAmount) : ''}
          onChange={(_, t) => updateSpell(s.id, { castTimeAmount: Number(t) || 0 })}
          style={styles.numCol}
        />
      </View>

      <ChipSelect
        label="Unité d'incantation"
        options={EFFECT_UNITS}
        value={s.castTimeUnit}
        onChange={(k) => updateSpell(s.id, { castTimeUnit: k as Spell['castTimeUnit'] })}
      />

      <TextInput label="Clé" value={cle} onChangeText={setCle} mode="outlined" dense />

      <TextInput
        label="Effet"
        value={effect}
        onChangeText={setEffect}
        mode="outlined"
        multiline
        style={styles.effect}
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
  itemName: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 1 },
  detail: { gap: 8, paddingLeft: 2, paddingBottom: 12 },
  detailEdit: { alignSelf: 'flex-start', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 92, fontSize: 14 },
  value: { flex: 1, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  numCol: { flexGrow: 1, flexBasis: 120, minWidth: 120 },
  effect: { minHeight: 72 },
});
