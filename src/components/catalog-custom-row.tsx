import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import Icon from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The « … personnalisé » entry every catalogue picker opens with: a plus tile,
 * a name, « Partir de zéro », a chevron. Shaped like a {@link CatalogRow} but
 * deliberately NOT one — it has no detail to disclose and no `+` of its own,
 * because the whole row IS the add.
 *
 * Extracted because the four pickers (armes, armures, boucliers, sortilèges)
 * carried a byte-identical copy of this markup and of the five styles under it,
 * and the label is the only thing that ever differed.
 */
export default function CatalogCustomRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useProphecyTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <View
        style={[
          styles.tile,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
        ]}>
        <Icon name="plus" size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.main}>
        <Text style={styles.name}>{label}</Text>
        <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>Partir de zéro</Text>
      </View>
      <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
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
});
