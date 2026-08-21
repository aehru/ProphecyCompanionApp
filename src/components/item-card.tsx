import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import Icon, { dsIcon } from '@/components/ui/icon';
import type { Item } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { deleteItem, updateItem } from '@/repositories/items';

/**
 * One inventory item: a read-only summary that flips to an inline editor via
 * the pencil, mirroring ArmorCard. Unlike armor, `equipped` is multi-slot —
 * tapping the tile toggles this item only, no other item is unequipped.
 */
export default function ItemCard({
  item,
  enchanted,
}: {
  item: Item;
  /** This item has at least one enchant bound to it (see the Magie tab). */
  enchanted?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <ItemEditor item={item} onClose={() => setEditing(false)} />
  ) : (
    <ItemSummary item={item} enchanted={enchanted} onEdit={() => setEditing(true)} />
  );
}

function ItemSummary({
  item: it,
  enchanted,
  onEdit,
}: {
  item: Item;
  enchanted?: boolean;
  onEdit: () => void;
}) {
  const theme = useProphecyTheme();
  const tileColor = it.equipped ? theme.colors.primary : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.item, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <View style={styles.itemRow}>
        <Pressable
          onPress={() => updateItem(it.id, { equipped: !it.equipped })}
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.surface,
              borderColor: it.equipped ? theme.colors.primary : theme.prophecy.borderSoft,
            },
          ]}>
          <Icon name="backpack" size={22} color={tileColor} />
        </Pressable>
        <View style={styles.itemMain}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {it.name || 'Objet'}
            </Text>
            {enchanted ? (
              <View accessibilityLabel="Enchanté" style={styles.enchantBadge}>
                <Icon name="magic" size={14} color={theme.colors.primary} />
              </View>
            ) : null}
          </View>
          <View style={styles.subRow}>
            {it.quantity !== 1 ? (
              <Text style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}>
                ×{it.quantity}
              </Text>
            ) : null}
            {it.description.trim() !== '' ? (
              <Text
                style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}>
                {it.description.trim()}
              </Text>
            ) : null}
            {it.equipped ? (
              <Text style={[styles.itemSub, { color: theme.colors.primary }]}>· Équipé</Text>
            ) : null}
          </View>
        </View>
        <IconButton icon={dsIcon('edit')} size={18} onPress={onEdit} />
      </View>
    </View>
  );
}

/** Inline editor. Edits persist live (debounced) like the weapon/armor editor. */
function ItemEditor({ item: it, onClose }: { item: Item; onClose: () => void }) {
  const theme = useProphecyTheme();
  const [name, setName] = useDebouncedText(it.name, (t) => updateItem(it.id, { name: t }));
  const [description, setDescription] = useDebouncedText(it.description, (t) =>
    updateItem(it.id, { description: t }),
  );

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cet objet ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteItem(it.id) },
    ]);

  return (
    <>
      <TextInput label="Nom" value={name} onChangeText={setName} mode="outlined" dense />

      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        dense
        multiline
      />

      <NumberField
        fieldKey="quantity"
        label="Quantité"
        value={it.quantity ? String(it.quantity) : ''}
        onChange={(_, t) => updateItem(it.id, { quantity: Math.max(0, Number(t) || 0) })}
        style={styles.qtyField}
      />

      {/* Both actions on one row, in the flow: the close button used to float
          over the card's top-right corner, where it landed on top of the Objets
          search field. */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="delete"
          textColor={theme.colors.error}
          onPress={confirmDelete}
          style={styles.actionBtn}>
          Supprimer
        </Button>
        <Button
          mode="contained"
          icon={dsIcon('check')}
          onPress={onClose}
          style={styles.actionBtn}>
          Terminer
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  enchantBadge: { alignItems: 'center', justifyContent: 'center' },
  subRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 1 },
  itemSub: { fontSize: 12 },
  qtyField: { flexGrow: 0, flexBasis: 120, minWidth: 120 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
});
