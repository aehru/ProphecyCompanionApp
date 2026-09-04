// "Mes PNJ": the table itself. Works with no server — these characters live in
// this device's DB and are what the Compagnie renders.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import CharacterPickList, {
  type PickableCharacter,
} from '@/components/campaign/character-pick-list';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function TableNpcSection({
  characters,
  memberIds,
  onCreate,
  onToggle,
}: {
  characters: PickableCharacter[];
  /** Character ids currently at this table. */
  memberIds: number[];
  onCreate: () => void;
  onToggle: (character: PickableCharacter, next: boolean) => void;
}) {
  const theme = useProphecyTheme();
  return (
    <>
      <View style={styles.header}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
          Mes PNJ
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {memberIds.length === 0 ? 'aucun à la table' : `${memberIds.length} à la table`}
        </Text>
      </View>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Les personnages cochés composent la Compagnie : fiches, blessures et initiative, sur cet
        appareil.
      </Text>
      <Button testID="new-npc" mode="outlined" icon={dsIcon('plus')} onPress={onCreate}>
        Nouveau PNJ
      </Button>
      <CharacterPickList characters={characters} sharedIds={memberIds} onToggle={onToggle} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
