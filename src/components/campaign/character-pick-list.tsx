// Multi-select character checklist shared by the player salon ("mes personnages
// diffusés") and the GM salon ("mes PNJ"). v2 of the campaign protocol shares N
// characters per campaign, so this replaced the old single-select radio picker.
// Empty selection simply means nothing is shared (the old "Ne rien partager"
// row is gone).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';

import { PlayerAvatar } from '@/components/campaign/roster-visuals';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/** The slice of a character row the picker needs (uuid must be non-null). */
export interface PickableCharacter {
  id: number;
  nom: string;
  uuid: string | null;
}

export default function CharacterPickList({
  characters,
  sharedIds,
  onToggle,
}: {
  characters: PickableCharacter[];
  /** Character ids currently shared into the campaign. */
  sharedIds: number[];
  onToggle: (character: PickableCharacter, next: boolean) => void;
}) {
  const theme = useProphecyTheme();
  const shared = new Set(sharedIds);
  // Only characters with a portable uuid can be projected onto the server.
  const shareable = characters.filter((c) => c.uuid != null);

  if (shareable.length === 0) {
    return (
      <View
        style={[
          styles.empty,
          { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant },
        ]}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Aucun personnage partageable.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 9 }}>
      {shareable.map((c) => {
        const nom = c.nom || 'Sans nom';
        const checked = shared.has(c.id);
        return (
          <View
            key={c.id}
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.surface,
                borderColor: checked ? theme.colors.primary : theme.prophecy.borderSoft,
              },
            ]}>
            <PlayerAvatar nom={nom} online={checked} size={38} />
            <Text
              style={{ flex: 1, fontFamily: 'Cinzel_600SemiBold', color: theme.colors.onSurface }}>
              {nom}
            </Text>
            <Checkbox
              status={checked ? 'checked' : 'unchecked'}
              onPress={() => onToggle(c, !checked)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: { padding: 20, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
});
