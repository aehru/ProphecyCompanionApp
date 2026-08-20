// Contextual header of the character list while rows are selected (issue #94):
// « Tout sélectionner », dupliquer, exporter, supprimer. Four buttons have to
// fit next to a title on a 360dp phone, hence the tightened size/margin — a
// Paper IconButton is 48dp wide by default and the row would overflow.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function CharacterSelectionActions({
  allSelected,
  busy,
  onToggleAll,
  onDuplicate,
  onExport,
  onDelete,
}: {
  allSelected: boolean;
  busy: boolean;
  onToggleAll: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.row}>
      <IconButton
        icon={allSelected ? 'select-off' : 'select-all'}
        testID="selection-toggle-all"
        size={22}
        style={styles.button}
        accessibilityLabel={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
        onPress={onToggleAll}
      />
      <IconButton
        icon="content-copy"
        testID="selection-duplicate"
        size={22}
        style={styles.button}
        disabled={busy}
        accessibilityLabel="Dupliquer la sélection"
        onPress={onDuplicate}
      />
      <IconButton
        icon="export"
        testID="selection-export"
        size={22}
        style={styles.button}
        disabled={busy}
        accessibilityLabel="Exporter la sélection"
        onPress={onExport}
      />
      <IconButton
        icon="delete-outline"
        testID="selection-delete"
        size={22}
        style={styles.button}
        disabled={busy}
        iconColor={theme.colors.error}
        accessibilityLabel="Supprimer la sélection"
        onPress={onDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  button: { margin: 0 },
});
