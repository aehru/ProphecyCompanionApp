// Désavantages: the age's obligatoires, then its optional supplémentaires, one
// slot each drawn from the rarities the table names. Every point they grant
// funds the avantages on the next step.

import { useState } from 'react';
import { Text } from 'react-native-paper';

import ChosenTraitRow from '@/components/creation/chosen-trait-row';
import TraitChooserDialog from '@/components/creation/trait-chooser-dialog';
import TraitPoolBar from '@/components/trait-pool-bar';
import SectionCard from '@/components/ui/section-card';
import { TRAIT_RARITY_LABEL } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { buildTraitPool, type CreationBuild, type TraitChoice } from '@/lib/creation';
import { type DesavantageSlot, desavantageSlots } from '@/lib/creation-rules';

const raritiesLabel = (slot: DesavantageSlot) =>
  slot.rarities.map((r) => TRAIT_RARITY_LABEL[r]).join(' ou ');

export default function DesavantagesStep({
  build,
  onChange,
}: {
  build: CreationBuild;
  onChange: (build: CreationBuild) => void;
}) {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState<DesavantageSlot | null>(null);
  const slots = desavantageSlots(build.age);

  const setSlot = (id: string, choice: TraitChoice | null) => {
    const next = { ...build.desavantages };
    if (choice) next[id] = choice;
    else delete next[id];
    onChange({ ...build, desavantages: next });
  };

  const section = (required: boolean) =>
    slots
      .filter((s) => s.required === required)
      .map((s) => (
        <ChosenTraitRow
          key={s.id}
          testID={`slot-${s.id}`}
          caption={raritiesLabel(s)}
          choice={build.desavantages[s.id]}
          onChoose={() => setOpen(s)}
          onClear={() => setSlot(s.id, null)}
        />
      ));

  return (
    <>
      <TraitPoolBar pool={buildTraitPool(build)} />
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        Chaque désavantage rapporte des points d’avantage, dépensés à l’étape suivante. Le nombre et
        la liste dépendent de l’âge de départ.
      </Text>
      <SectionCard title="OBLIGATOIRES">{section(true)}</SectionCard>
      <SectionCard title="SUPPLÉMENTAIRES" helper="facultatifs">
        {section(false)}
      </SectionCard>
      <TraitChooserDialog
        visible={open != null}
        title={open ? `Désavantage ${raritiesLabel(open).toLowerCase()}` : ''}
        kind="desavantage"
        rarities={open?.rarities}
        onDismiss={() => setOpen(null)}
        onChoose={(preset, pick) => open && setSlot(open.id, { presetId: preset.id, ...pick })}
      />
    </>
  );
}
