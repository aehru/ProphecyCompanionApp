// Avantages: bought with the points the désavantages granted. The balance is
// shown and an avantage dearer than it is flagged — never blocked, the same
// rule as the sheet's catalogue.

import { useState } from 'react';
import { Button, Text } from 'react-native-paper';

import ChosenTraitRow from '@/components/creation/chosen-trait-row';
import TraitChooserDialog from '@/components/creation/trait-chooser-dialog';
import TraitPoolBar from '@/components/trait-pool-bar';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { buildTraitPool, type CreationBuild } from '@/lib/creation';

export default function AvantagesStep({
  build,
  onChange,
}: {
  build: CreationBuild;
  onChange: (build: CreationBuild) => void;
}) {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState(false);
  const pool = buildTraitPool(build);

  return (
    <>
      <TraitPoolBar pool={pool} />
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        Dépensez les points gagnés avec les désavantages.
      </Text>
      <SectionCard title="AVANTAGES CHOISIS">
        {build.avantages.map((c, i) => (
          <ChosenTraitRow
            key={`${c.presetId}-${i}`}
            choice={c}
            onClear={() =>
              onChange({ ...build, avantages: build.avantages.filter((_, j) => j !== i) })
            }
          />
        ))}
        <Button
          mode="outlined"
          icon={dsIcon('plus')}
          onPress={() => setOpen(true)}
          testID="add-avantage">
          Ajouter un avantage
        </Button>
      </SectionCard>
      <TraitChooserDialog
        visible={open}
        title="Avantage"
        kind="avantage"
        pool={pool}
        onDismiss={() => setOpen(false)}
        onChoose={(preset, pick) =>
          onChange({ ...build, avantages: [...build.avantages, { presetId: preset.id, ...pick }] })
        }
      />
    </>
  );
}
