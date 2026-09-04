import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import { traitEvolvingLabel } from '@/components/trait-detail';
import { TRAIT_ICON } from '@/components/trait-icon';
import ChipSelect from '@/components/ui/chip-select';
import Icon, { dsIcon } from '@/components/ui/icon';
import {
  TRAIT_KIND_RARITIES,
  TRAIT_KINDS,
  TRAIT_RARITIES,
  TRAIT_RARITY_LABEL,
  type TraitKind,
  type TraitRarity,
} from '@/constants/prophecy';
import type { Trait } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { deleteTrait, updateTrait } from '@/repositories/traits';

// Hoisted: a fresh array on every render is a changed prop to <ChipSelect>.
const KIND_OPTIONS = TRAIT_KINDS.map((k) => ({ key: k.key, label: k.label }));

/**
 * One taken avantage / désavantage, as a read-only row: kind tile, name, the
 * player's own précision, and the points it moves — signed, because the whole
 * list is read as an addition (`+3` granted, `−2` spent).
 *
 * The row OPENS THE EDITOR rather than editing in place: the character home is
 * a glanceable dashboard (see the screen's doc comment), and everything it can
 * change it changes through a modal.
 */
export default function TraitRow({ trait, characterId }: { trait: Trait; characterId: number }) {
  const theme = useProphecyTheme();
  const router = useRouter();
  const granted = trait.kind === 'desavantage';
  const points = `${granted ? '+' : '−'}${trait.cost}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Modifier cette entrée"
      onPress={() => router.push(`/character/${characterId}/trait/${trait.id}`)}
      style={[styles.row, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <View
        style={[
          styles.tile,
          { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft },
        ]}>
        <Icon name={TRAIT_ICON[trait.kind]} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {trait.name || 'Sans nom'}
        </Text>
        <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {/* The player's own précision wins over the rulebook summary: on a
              « Phobie » it is the only half that says what this character's
              entry actually is. The summary fills the line otherwise. */}
          {[
            TRAIT_RARITY_LABEL[trait.rarity] ?? trait.rarity,
            trait.note.trim() || trait.inGameEffect.trim(),
          ]
            .filter((s) => s !== '')
            .join(' · ')}
        </Text>
      </View>
      <Text
        style={[styles.points, { color: granted ? theme.colors.primary : theme.colors.onSurface }]}>
        {points}
      </Text>
    </Pressable>
  );
}

/**
 * The editor, shown in the `trait/[tid]` modal. Edits persist live (debounced)
 * like the weapon/armor/item editors.
 *
 * `description` is editable even on a catalogue pick: the entry belongs to this
 * character now, and a GM ruling that changes what it means at this table has
 * nowhere else to be written. What that costs is only the provenance signal —
 * `presetId` still says where the row came from, and `presetRevision` still says
 * at which version, so a future "mettre à jour depuis le catalogue" flow can
 * still find the row; it just can't assume the paragraph is untouched.
 */
export function TraitEditor({ trait: t, onClose }: { trait: Trait; onClose: () => void }) {
  const theme = useProphecyTheme();
  const [name, setName] = useDebouncedText(t.name, (v) => updateTrait(t.id, { name: v }));
  const [note, setNote] = useDebouncedText(t.note, (v) => updateTrait(t.id, { note: v }));
  const [description, setDescription] = useDebouncedText(t.description, (v) =>
    updateTrait(t.id, { description: v }),
  );
  const [inGameEffect, setInGameEffect] = useDebouncedText(t.inGameEffect, (v) =>
    updateTrait(t.id, { inGameEffect: v }),
  );

  // Only the rarities that exist for this side, plus whatever the row already
  // carries — an imported or later-rulebook value must not vanish from the
  // chips the moment its own row is opened.
  const rarities = TRAIT_RARITIES.filter(
    (r) => TRAIT_KIND_RARITIES[t.kind].includes(r.key) || r.key === t.rarity,
  );

  const confirmDelete = () =>
    Alert.alert('Supprimer', `Supprimer « ${t.name || 'cette entrée'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteTrait(t.id);
          onClose();
        },
      },
    ]);

  return (
    <>
      <TextInput label="Nom" value={name} onChangeText={setName} mode="outlined" dense />

      <ChipSelect
        label="Type"
        info="Un désavantage donne des points, un avantage en dépense."
        options={KIND_OPTIONS}
        value={t.kind}
        onChange={(key) => updateTrait(t.id, { kind: key as TraitKind })}
      />

      <ChipSelect
        label="Rareté"
        info="Indication du livre de règles. Aucune restriction n'est appliquée."
        options={rarities.map((r) => ({ key: r.key, label: r.label }))}
        value={t.rarity}
        onChange={(key) => updateTrait(t.id, { rarity: key as TraitRarity })}
      />

      <NumberField
        fieldKey="cost"
        label="Coût en points"
        value={t.cost ? String(t.cost) : ''}
        onChange={(_, v) => updateTrait(t.id, { cost: Math.max(0, Number(v) || 0) })}
        style={styles.costField}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{traitEvolvingLabel(t.kind)}</Text>
        <Switch
          value={t.evolving}
          onValueChange={(v) => updateTrait(t.id, { evolving: v })}
        />
      </View>

      <TextInput
        label="Précision"
        placeholder="Ce que c'est pour ce personnage"
        value={note}
        onChangeText={setNote}
        mode="outlined"
        dense
      />

      <TextInput
        label="Effet en jeu"
        placeholder="Ce que ça change mécaniquement"
        value={inGameEffect}
        onChangeText={setInGameEffect}
        mode="outlined"
        dense
        multiline
      />

      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        dense
        multiline
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
        <Button mode="contained" icon={dsIcon('check')} onPress={onClose} style={styles.actionBtn}>
          Terminer
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 8, borderBottomWidth: 1 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 1 },
  points: { fontFamily: 'Cinzel_600SemiBold', fontSize: 16 },
  costField: { flexGrow: 0, flexBasis: 140, minWidth: 140 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { fontSize: 13, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
});
