// Pick one avantage or désavantage from the catalogue, narrowed to the rarities
// a creation slot allows. Tapping an entry goes through the same pick flow as
// the sheet's catalogue (price tier, précision), then closes.

import { StyleSheet } from 'react-native';
import { Button, List, Text } from 'react-native-paper';

import { type TraitPick, useTraitPick } from '@/components/trait-pick-dialog';
import DsDialog from '@/components/ui/ds-dialog';
import { TRAIT_RARITY_LABEL, type TraitKind, type TraitRarity } from '@/constants/prophecy';
import { TRAIT_CATALOG, type TraitPreset } from '@/data/trait-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { traitCostLabel, traitUnaffordable, type TraitPool } from '@/lib/trait-pool';

export default function TraitChooserDialog({
  visible,
  title,
  kind,
  rarities,
  pool,
  onDismiss,
  onChoose,
}: {
  visible: boolean;
  title: string;
  kind: TraitKind;
  /** Only these headings; every one of the kind when omitted. */
  rarities?: readonly TraitRarity[];
  /** Flags an avantage dearer than what is left (never blocks). */
  pool?: TraitPool;
  onDismiss: () => void;
  onChoose: (preset: TraitPreset, pick: TraitPick) => void;
}) {
  const theme = useProphecyTheme();
  const { pick, dialog } = useTraitPick((preset, p) => {
    onChoose(preset, p);
    onDismiss();
  });
  const entries = TRAIT_CATALOG.filter(
    (p) => p.data.kind === kind && (!rarities || rarities.includes(p.data.rarity as TraitRarity)),
  );

  return (
    <>
      <DsDialog
        visible={visible}
        onDismiss={onDismiss}
        title={title}
        dismiss={<Button onPress={onDismiss}>Fermer</Button>}>
        {entries.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Aucune entrée saisie pour cette liste.
          </Text>
        ) : null}
        {entries.map((p) => {
          const short = traitUnaffordable({ kind, costs: p.costs }, pool);
          return (
            <List.Item
              key={p.id}
              testID={`choose-${p.id}`}
              title={p.data.name}
              titleStyle={styles.title}
              description={[
                `${traitCostLabel(p.costs)} · ${TRAIT_RARITY_LABEL[p.data.rarity ?? ''] ?? ''}`,
                p.data.inGameEffect,
              ]
                .filter(Boolean)
                .join('\n')}
              descriptionNumberOfLines={3}
              descriptionStyle={short ? { color: theme.colors.error } : undefined}
              style={styles.item}
              onPress={() => pick(p)}
            />
          );
        })}
      </DsDialog>
      {dialog}
    </>
  );
}

const styles = StyleSheet.create({
  item: { paddingHorizontal: 0 },
  title: { fontWeight: '600' },
});
