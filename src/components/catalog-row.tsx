import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import Icon, { dsIcon, type IconName } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * One row of a catalogue picker (armes, armures, boucliers, sortilèges).
 *
 * **Tapping the row previews**, it does not add: browsing the rulebook is what
 * the catalogue is mostly used for, and adding-then-deleting was the only way
 * to read a spell's effect before. The **`+` on the right adds** — so picking a
 * known entry is still one tap, and the preview is opt-in.
 *
 * `children` is the detail body, rendered only while expanded — the very same
 * `*Detail` component the Fiche shows, so the numbers a player reads here are
 * the numbers they will get.
 */
export default function CatalogRow({
  icon,
  name,
  subtitle,
  addLabel,
  onAdd,
  alert,
  children,
}: {
  icon: IconName;
  name: string;
  subtitle?: string;
  /** Accessibility label for the add button, e.g. « Ajouter Épée courte ». */
  addLabel: string;
  onAdd: () => void;
  /** Flags the tile in the error colour (an unmet prérequis), like the cards do. */
  alert?: boolean;
  children?: React.ReactNode;
}) {
  const theme = useProphecyTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.item, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Pressable
        style={styles.itemRow}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint="Affiche le détail de cette entrée"
        onPress={() => setExpanded((e) => !e)}>
        <View
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.surface,
              borderColor: alert ? theme.colors.error : theme.prophecy.borderSoft,
              borderWidth: alert ? 1.5 : 1,
            },
          ]}>
          <Icon name={icon} size={22} color={alert ? theme.colors.error : theme.colors.primary} />
        </View>
        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {subtitle ? (
            <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {/* The add button, not a chevron: the row itself is the disclosure. */}
        <IconButton
          icon={dsIcon('plus')}
          size={22}
          iconColor={theme.colors.primary}
          accessibilityLabel={addLabel}
          onPress={onAdd}
          style={styles.add}
        />
      </Pressable>

      {expanded ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 6 },
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
  add: { margin: 0 },
});
