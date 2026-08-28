import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
 *
 * Pass `collapsible` to turn the header into a disclosure — the same one
 * `SectionHeader` already draws for the spell catalogue's groups, so a folded
 * section looks identical wherever it appears. With `defaultExpanded={false}`
 * the section starts folded: for a block that is occasionally useful but always
 * in the way otherwise. The state is the card's own; a caller that needs to
 * drive the fold from outside should use `<SectionHeader>` directly.
 */
export default function SectionCard({
  title,
  children,
  helper,
  icon,
  collapsible = false,
  defaultExpanded = true,
}: {
  title: string;
  helper?: string;
  icon?: IconName;
  collapsible?: boolean;
  /** Only read when `collapsible`; a plain section is always open. */
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.section}>
      <SectionHeader
        title={title}
        helper={helper}
        icon={icon}
        // Both undefined unless collapsible: `onPress` is what turns the header
        // into a button and puts the chevron there.
        expanded={collapsible ? expanded : undefined}
        onPress={collapsible ? () => setExpanded((open) => !open) : undefined}
      />
      {!collapsible || expanded ? children : null}
    </View>
  );
}

/**
 * The header row on its own — for a virtualized list, where the section's rows
 * are items rather than children (`SectionList`'s `renderSectionHeader`).
 *
 * Pass `onPress` to make it a **disclosure**: the whole row becomes the tap
 * target (a 16px chevron alone is a miss on a phone) and a chevron appears at
 * the end, pointing right when folded and down when `expanded`.
 */
export function SectionHeader({
  title,
  helper,
  icon,
  expanded,
  onPress,
}: {
  title: string;
  helper?: string;
  icon?: IconName;
  /** Only meaningful with `onPress`; drives the chevron and the a11y state. */
  expanded?: boolean;
  onPress?: () => void;
}) {
  const theme = useProphecyTheme();
  const row = (
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
      {onPress ? (
        <View style={[styles.chevron, expanded ? styles.chevronOpen : null]}>
          <Icon name="chev" size={16} color={theme.colors.onSurfaceVariant} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return row;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityHint="Replie ou déplie cette section">
      {row}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { letterSpacing: 1.6, textTransform: 'uppercase' },
  // Fills the row to the right of the title (and helper, if any).
  rule: { flex: 1, height: 1 },
  helper: { flexShrink: 0, fontSize: 12 },
  // Rotated rather than a second glyph, so the fold reads as one motion.
  chevron: { flexShrink: 0 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
});
