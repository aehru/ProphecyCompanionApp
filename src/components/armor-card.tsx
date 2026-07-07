import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import Icon, { dsIcon } from '@/components/ui/icon';
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
  const tileColor = a.equipped ? theme.colors.primary : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.item, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <View style={styles.itemRow}>
        {/* Tap the shield tile to equip (one armor equipped at a time). */}
        <Pressable
          onPress={() => equipArmor(a.characterId, a.id)}
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.surface,
              borderColor: a.equipped ? theme.colors.primary : theme.prophecy.borderSoft,
            },
          ]}>
          <Icon name="shield" size={22} color={tileColor} />
        </Pressable>
        <View style={styles.itemMain}>
          <Text style={styles.itemName} numberOfLines={1}>
            {a.name || 'Armure'}
          </Text>
          <View style={styles.subRow}>
            <Text style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}>
              Défense {a.defenseCurrent}/{a.defenseMax}
            </Text>
            {a.equipped ? (
              <Text style={[styles.itemSub, { color: theme.colors.primary }]}>· Équipée</Text>
            ) : null}
          </View>
        </View>
        <IconButton icon={dsIcon('edit')} size={18} onPress={onEdit} />
      </View>
    </View>
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
      <IconButton icon={dsIcon('check')} style={styles.editBtn} size={18} onPress={onClose} />

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
  // DS inventory row.
  item: { borderBottomWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 8 },
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
  subRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 1 },
  itemSub: { fontSize: 12 },
  maxField: { flexGrow: 0, flexBasis: 120, minWidth: 120 },
});
