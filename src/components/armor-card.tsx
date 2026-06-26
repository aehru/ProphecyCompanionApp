import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SectionCard from '@/components/ui/section-card';
import type { Armor } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { deleteArmor, equipArmor, updateArmor } from '@/repositories/armor';

/**
 * One armor: a read-only summary that flips to an inline editor via the pencil,
 * mirroring WeaponCard. The shield button equips it (one armor equipped at a
 * time); current defense is tracked live on the Résumé tab.
 */
export default function ArmorCard({ armor }: { armor: Armor }) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <ArmorEditor armor={armor} onClose={() => setEditing(false)} />
  ) : (
    <ArmorSummary armor={armor} onEdit={() => setEditing(true)} />
  );
}

function ArmorSummary({ armor: a, onEdit }: { armor: Armor; onEdit: () => void }) {
  const theme = useProphecyTheme();
  const equipColor = a.equipped ? theme.colors.primary : theme.colors.onSurfaceVariant;
  return (
    <SectionCard title={(a.name || 'Armure').toUpperCase()}>
      <IconButton icon="pencil" style={styles.editBtn} size={18} onPress={onEdit} />
      <View style={styles.row}>
        <IconButton
          icon={a.equipped ? 'shield' : 'shield-outline'}
          iconColor={equipColor}
          size={22}
          style={styles.shield}
          onPress={() => equipArmor(a.characterId, a.id)}
        />
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Défense</Text>
        <Text style={styles.value}>
          {a.defenseCurrent} / {a.defenseMax}
        </Text>
      </View>
    </SectionCard>
  );
}

/** Inline editor. Edits persist live (debounced) like the weapon editor. */
function ArmorEditor({ armor: a, onClose }: { armor: Armor; onClose: () => void }) {
  const theme = useProphecyTheme();
  const [name, setName] = useDebouncedText(a.name, (t) => updateArmor(a.id, { name: t }));

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cette armure ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteArmor(a.id) },
    ]);

  return (
    <SectionCard title="MODIFIER">
      <IconButton icon="check" style={styles.editBtn} size={18} onPress={onClose} />

      <TextInput label="Nom" value={name} onChangeText={setName} mode="outlined" dense />

      <NumberField
        fieldKey="defenseMax"
        label="Défense max"
        value={a.defenseMax ? String(a.defenseMax) : ''}
        onChange={(_, t) => {
          const max = Number(t) || 0;
          // An undamaged armor (current at its max) stays full as the max
          // changes; a damaged one clamps to the new ceiling.
          const full = a.defenseCurrent >= a.defenseMax;
          updateArmor(a.id, {
            defenseMax: max,
            defenseCurrent: full ? max : Math.min(a.defenseCurrent, max),
          });
        }}
        style={styles.maxField}
      />

      <Button
        mode="contained-tonal"
        icon="hammer-wrench"
        onPress={() => updateArmor(a.id, { defenseCurrent: a.defenseMax })}>
        Réparer
      </Button>

      <Button mode="outlined" icon="delete" textColor={theme.colors.error} onPress={confirmDelete}>
        Supprimer
      </Button>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  editBtn: { position: 'absolute', top: 0, right: 0, margin: 2, zIndex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shield: { margin: 0 },
  label: { fontSize: 14 },
  value: { fontSize: 15, fontWeight: '600' },
  maxField: { flexGrow: 0, flexBasis: 120, minWidth: 120 },
});
