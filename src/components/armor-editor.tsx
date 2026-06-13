import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, RadioButton, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SectionCard from '@/components/ui/section-card';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  armorQuery,
  createArmor,
  deleteArmor,
  equipArmor,
  updateArmor,
} from '@/repositories/armor';

/**
 * Combat-tab armor manager. Armor rows carry live in-play state (current
 * defense, equipped flag), so they're edited directly against the DB rather
 * than batched into the form's save. A brand-new character has no id yet, so we
 * ask the player to save first before adding armor.
 */
export default function ArmorEditor({ characterId }: { characterId?: number }) {
  if (!characterId) {
    return (
      <SectionCard title="ARMURE">
        <Text>Enregistrez le personnage pour gérer son armure.</Text>
      </SectionCard>
    );
  }
  return <ArmorList characterId={characterId} />;
}

function ArmorList({ characterId }: { characterId: number }) {
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(armorQuery(characterId));
  const list = data ?? [];
  const equippedId = list.find((a) => a.equipped)?.id;

  return (
    <SectionCard title="ARMURE">
      {list.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Aucune armure.</Text>
      ) : (
        <RadioButton.Group
          value={equippedId != null ? String(equippedId) : ''}
          onValueChange={(v) => equipArmor(characterId, Number(v))}>
          {list.map((a) => (
            <View key={a.id} style={styles.row}>
              <RadioButton value={String(a.id)} />
              <TextInput
                style={styles.name}
                dense
                mode="outlined"
                placeholder="Nom de l'armure"
                value={a.name}
                onChangeText={(t) => updateArmor(a.id, { name: t })}
              />
              <NumberField
                fieldKey={String(a.id)}
                label="Déf. max"
                value={a.defenseMax ? String(a.defenseMax) : ''}
                onChange={(_, t) => {
                  const max = Number(t) || 0;
                  // Undamaged armor (incl. fresh, current === max) stays full when
                  // max changes; damaged armor keeps current clamped to the ceiling.
                  const full = a.defenseCurrent >= a.defenseMax;
                  updateArmor(a.id, {
                    defenseMax: max,
                    defenseCurrent: full ? max : Math.min(a.defenseCurrent, max),
                  });
                }}
                style={styles.maxField}
              />
              <IconButton
                icon="delete"
                iconColor={theme.colors.error}
                onPress={() => deleteArmor(a.id)}
              />
            </View>
          ))}
        </RadioButton.Group>
      )}
      <Button mode="outlined" icon="plus" onPress={() => createArmor(characterId)}>
        Ajouter une armure
      </Button>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flex: 1 },
  maxField: { flexGrow: 0, flexBasis: 80, minWidth: 80 },
});
