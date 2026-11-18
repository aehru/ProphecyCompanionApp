// One taken (or still empty) avantage / désavantage line in a creation step:
// what it is and its price, or a button to choose it — with a way to undo.

import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { TRAIT_BY_ID } from '@/data/trait-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { TraitChoice } from '@/lib/creation';

export default function ChosenTraitRow({
  caption,
  choice,
  onChoose,
  onClear,
  testID,
}: {
  /** « Obligatoire · Commun », « Supplémentaire · Enfant ou Commun ». */
  caption?: string;
  choice: TraitChoice | undefined;
  /** Only for an empty slot; a taken one offers removal instead. */
  onChoose?: () => void;
  onClear: () => void;
  testID?: string;
}) {
  const theme = useProphecyTheme();
  const preset = choice ? TRAIT_BY_ID.get(choice.presetId) : undefined;
  return (
    <View
      testID={testID}
      style={[styles.row, { borderColor: theme.prophecy.borderSoft }]}>
      <View style={styles.text}>
        {caption ? (
          <Text style={[styles.caption, { color: theme.colors.onSurfaceVariant }]}>{caption}</Text>
        ) : null}
        {choice ? (
          <Text>
            {preset?.data.name ?? choice.presetId}
            {choice.note ? ` (${choice.note})` : ''} · {choice.cost} pt{choice.cost > 1 ? 's' : ''}
          </Text>
        ) : null}
      </View>
      {choice ? (
        <IconButton icon={dsIcon('close')} size={18} accessibilityLabel="Retirer" onPress={onClear} />
      ) : (
        <Button mode="outlined" compact onPress={onChoose}>
          Choisir
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, borderBottomWidth: 1 },
  text: { flex: 1, gap: 2 },
  caption: { fontSize: 12 },
});
