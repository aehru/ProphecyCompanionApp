import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import DsDialog from '@/components/ui/ds-dialog';
import Icon, { dsIcon } from '@/components/ui/icon';
import type { Weapon } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { skillOptions, specializationsOf } from '@/lib/weapon-skill';
import { skillsQuery } from '@/repositories/skills';
import { updateWeapon } from '@/repositories/weapons';

/**
 * The weapon editor's « Compétence » field: the skill this weapon is wielded
 * with, which drives the attack total on its card.
 *
 * TWO STEPS on purpose. Step one lists the base compétences only, grouped by
 * attribut then A→Z — the whole catalogue, because a bomb thrown with Alchimie
 * is the GM's call, not this picker's. Step two appears ONLY when the chosen
 * compétence has spécialisations on this character; picking one is what lets a
 * player point their épée longue at « Armes tranchantes (Épée longue) » instead
 * of the mother. A compétence with no spec commits straight away, so the common
 * case stays one tap.
 */
export default function WeaponSkillField({ weapon: w }: { weapon: Weapon }) {
  const theme = useProphecyTheme();
  const { data: skills } = useLiveQuery(skillsQuery(w.characterId), [w.characterId]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Non-null while step two is showing: the compétence whose spécialisations
  // are being offered.
  const [mother, setMother] = useState<string | null>(null);

  const skillList = skills ?? [];
  const close = () => {
    setOpen(false);
    setQuery('');
    setMother(null);
  };
  const commit = (name: string | null) => {
    updateWeapon(w.id, { skillName: name });
    close();
  };

  const choose = (name: string) => {
    // Straight to the value when there is no spécialisation to disambiguate.
    if (specializationsOf(name, skillList).length === 0) commit(name);
    else setMother(name);
  };

  // Only while the dialog is up: merging the catalogue with the character's rows
  // and sorting four groups is wasted on every render of the closed field.
  const groups = open ? skillOptions(skillList, query) : [];
  const specs = mother ? specializationsOf(mother, skillList) : [];

  return (
    <View style={styles.root}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Compétence</Text>
      <View style={styles.controls}>
        <Button
          mode="outlined"
          icon={dsIcon('book')}
          contentStyle={styles.pickContent}
          style={styles.pick}
          onPress={() => setOpen(true)}>
          {w.skillName ?? 'Choisir une compétence'}
        </Button>
        {w.skillName ? (
          <Button compact onPress={() => commit(null)}>
            Retirer
          </Button>
        ) : null}
      </View>

      <DsDialog
        visible={open}
        onDismiss={close}
        title={mother ? 'Spécialisation' : 'Compétence'}
        actions={
          <>
            <Button onPress={close}>Annuler</Button>
            {mother ? <Button onPress={() => setMother(null)}>Retour</Button> : null}
          </>
        }>
        {mother ? (
          <View style={styles.list}>
            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              {mother} a des spécialisations. Laquelle cette arme utilise-t-elle ?
            </Text>
            <Row
              name={mother}
              sub="Compétence générale"
              selected={w.skillName === mother}
              onPress={() => commit(mother)}
            />
            {specs.map((s) => (
              <Row
                key={s.name}
                name={s.specLabel?.trim() || s.name}
                sub={`Spécialisation · ${s.value}`}
                selected={w.skillName === s.name}
                onPress={() => commit(s.name)}
              />
            ))}
          </View>
        ) : (
          <>
            <TextInput
              label="Rechercher"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {groups.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucune compétence ne correspond.
              </Text>
            ) : null}
            {groups.map((g) => (
              <View key={g.key} style={styles.list}>
                <Text style={[styles.group, { color: theme.colors.onSurfaceVariant }]}>
                  {g.label}
                </Text>
                {g.options.map((o) => (
                  <Row
                    key={o.name}
                    name={o.name}
                    // An unbought compétence is still pickable — you can loot a
                    // bow before learning to shoot; the card then reads the
                    // attribut alone.
                    sub={o.trained ? String(o.value) : 'non acquise'}
                    selected={w.skillName === o.name}
                    onPress={() => choose(o.name)}
                  />
                ))}
              </View>
            ))}
          </>
        )}
      </DsDialog>
    </View>
  );
}

function Row({
  name,
  sub,
  selected,
  onPress,
}: {
  name: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Text style={[styles.name, selected && { color: theme.colors.primary }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>{sub}</Text>
      {selected ? <Icon name="check" size={16} color={theme.colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  label: { fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pick: { flexShrink: 1 },
  pickContent: { justifyContent: 'flex-start' },
  hint: { fontSize: 13 },
  list: { gap: 0 },
  group: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12 },
});
