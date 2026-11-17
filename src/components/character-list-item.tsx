// One row of the character list. Extracted from the list screen so the row's
// two modes (normal / selectable, issue #94) stay readable next to each other.
// Flat: the row sits inside a <GroupedList>, which owns the border.

import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';

import { initials, playerAccent, useAttrColors } from '@/components/campaign/roster-accents';
import CasteChip from '@/components/caste-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { mediaUri } from '@/lib/media';

/** The slice of a `characters` row the list renders. */
export interface ListedCharacter {
  id: number;
  nom: string | null;
  concept: string | null;
  caste: string | null;
  avatarPath: string | null;
  kind: string | null;
}

const AVATAR = 44;

export default function CharacterListItem({
  character,
  broadcast,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}: {
  character: ListedCharacter;
  /** Shared into the campaign currently going live. */
  broadcast: boolean;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useProphecyTheme();
  const liveColor = useAttrColors().social;
  const nom = character.nom || 'Sans nom';

  return (
    <Pressable
      testID={`character-row-${character.id}`}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={nom}
      accessibilityState={selectionMode ? { selected } : undefined}
      style={({ pressed }) => [
        styles.row,
        (selected || pressed) && {
          backgroundColor: selected
            ? theme.colors.secondaryContainer
            : theme.prophecy.surfaceContainer,
        },
      ]}>
      {/* In selection mode the checkbox takes the avatar's slot — same row
          height, no layout shift on entering the mode. */}
      {selectionMode ? (
        <View style={styles.avatar}>
          <Checkbox status={selected ? 'checked' : 'unchecked'} onPress={onPress} />
        </View>
      ) : (
        <Avatar nom={nom} path={character.avatarPath} />
      )}
      <View style={styles.main}>
        <Text
          variant="bodyLarge"
          numberOfLines={1}
          style={[styles.title, { color: theme.colors.onSurface }]}>
          {nom}
        </Text>
        {character.caste || character.concept ? (
          <View style={styles.subtitle}>
            <CasteChip caste={character.caste} style={styles.chip} />
            {character.concept ? (
              <Text
                variant="bodyMedium"
                style={[styles.concept, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}>
                {character.concept}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      {broadcast ? (
        <View style={styles.live}>
          <View style={[styles.dot, { backgroundColor: liveColor }]} />
          <Text variant="labelMedium" style={{ color: liveColor }}>
            Diffusé
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** The portrait when there is one, else the name's initials on its accent. */
function Avatar({ nom, path }: { nom: string; path: string | null }) {
  const theme = useProphecyTheme();
  const uri = mediaUri(path);
  if (uri) return <Image source={uri} style={styles.avatar} contentFit="cover" />;
  const accent = playerAccent(nom);
  return (
    <View style={[styles.avatar, { backgroundColor: `${accent}55` }]}>
      <Text style={[styles.initials, { color: theme.colors.onSurface }]}>{initials(nom)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontFamily: 'Cinzel_600SemiBold', fontSize: 16 },
  main: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontWeight: '700' },
  subtitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 },
  concept: { flexShrink: 1 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
