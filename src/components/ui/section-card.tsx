import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import Icon, { type IconName } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * Prophecy Mobile DS section: a flat header — optional leading icon, engraved
 * Cinzel eyebrow, then a gold hairline filling the rest of the row — with its
 * content sitting directly on the page background (no surface, no box border).
 * Mirrors the DS character-sheet section pattern. Inner tiles keep their own
 * borders/fills; only the section wrapper is flat. Pass `icon` to add the DS
 * leading glyph; omit it for a plain title + rule. `helper` is a small trailing
 * note (e.g. an edit hint).
 */
export default function SectionCard({
  title,
  children,
  helper,
  icon,
}: {
  title: string;
  helper?: string;
  icon?: IconName;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} helper={helper} icon={icon} />
      {children}
    </View>
  );
}

/**
 * The header row on its own — for a virtualized list, where the section's rows
 * are items rather than children (`SectionList`'s `renderSectionHeader`).
 */
export function SectionHeader({
  title,
  helper,
  icon,
}: {
  title: string;
  helper?: string;
  icon?: IconName;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.header}>
      {icon ? <Icon name={icon} size={15} color={theme.colors.secondary} /> : null}
      <Text variant="titleSmall" style={[styles.title, { color: theme.colors.primary }]}>
        {title}
      </Text>
      <View style={[styles.rule, { backgroundColor: theme.prophecy.borderSoft }]} />
      {helper ? (
        <Text variant="titleSmall" style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { letterSpacing: 1.6, textTransform: 'uppercase' },
  // Fills the row to the right of the title (and helper, if any).
  rule: { flex: 1, height: 1 },
  helper: { flexShrink: 0, fontSize: 12 },
});
