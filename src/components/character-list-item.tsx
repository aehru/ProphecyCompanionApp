// One row of the character list. Extracted from the list screen so the row's
// two modes (normal / selectable, issue #94) stay readable next to each other.

import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Checkbox, List } from 'react-native-paper';

import { OwnerBadge } from '@/components/campaign/roster-badges';
import Icon from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { mediaUri } from '@/lib/media';

/** The slice of a `characters` row the list renders. */
export interface ListedCharacter {
  id: number;
  nom: string | null;
  concept: string | null;
  avatarPath: string | null;
  kind: string | null;
}

export default function CharacterListItem({
  character,
  inGrid,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}: {
  character: ListedCharacter;
  /** Two-column layout: the row must share its wrapper instead of filling it. */
  inGrid: boolean;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useProphecyTheme();
  const avatar = mediaUri(character.avatarPath);

  return (
    <List.Item
      style={[
        styles.item,
        inGrid && styles.itemInGrid,
        {
          backgroundColor: selected
            ? theme.colors.secondaryContainer
            : theme.prophecy.surfaceContainerLow,
          borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
        },
      ]}
      testID={`character-row-${character.id}`}
      title={character.nom || 'Sans nom'}
      description={character.concept || undefined}
      titleStyle={{ color: theme.colors.onSurface }}
      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
      // In selection mode the checkbox takes the avatar's slot rather than a
      // slot of its own — same row height, no layout shift on entering the mode.
      left={(p) =>
        selectionMode ? (
          <View style={[styles.avatar, styles.avatarFallback, styles.checkboxSlot]}>
            <Checkbox status={selected ? 'checked' : 'unchecked'} onPress={onPress} />
          </View>
        ) : avatar ? (
          <Image
            source={avatar}
            style={[styles.avatar, { borderColor: theme.colors.outlineVariant }]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              {
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}>
            <Icon name="character" size={22} color={theme.colors.onSurfaceVariant} />
          </View>
        )
      }
      // NPCs live in the same list as the player characters (they ARE
      // characters) — the badge is the only thing that tells them apart.
      // `p.style` carries List.Item's own centering and margin — drop
      // it and the pill stretches to the full row height.
      right={character.kind === 'npc' ? (p) => <OwnerBadge style={p.style} /> : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderRadius: 16,
  },
  // maxWidth only binds a lone item on the last row — without it, it stretches
  // across both columns. flex:1 still wins for a full row (gap makes it < 50%).
  itemInGrid: { flex: 1, maxWidth: '50%' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignSelf: 'center',
    marginLeft: 8,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  // The checkbox draws its own shape — the avatar ring would frame it twice.
  checkboxSlot: { borderWidth: 0 },
});
