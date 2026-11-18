// MAÎTRISE ET CHANCE: the age gives some points outright and leaves the rest to
// distribute between the two. Shown on the Attributs step.

import { Text } from 'react-native-paper';

import StepperRow from '@/components/creation/stepper-row';
import SectionCard from '@/components/ui/section-card';
import { RESOURCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  type CreationBuild,
  finalResource,
  resourcePointsLeft,
  stepResource,
} from '@/lib/creation';
import { resourceStart } from '@/lib/creation-rules';

/** « 4 points de Chance, 3 points à répartir » — the rulebook row, in words. */
function startLine(build: CreationBuild): string {
  const { fixed, free } = resourceStart(build.age);
  const given = RESOURCES.flatMap((r) =>
    fixed[r.key] ? [`${fixed[r.key]} points de ${r.label}`] : [],
  );
  return [...given, `${free} points à répartir`].join(', ');
}

export default function ResourcesPicker({
  build,
  onChange,
}: {
  build: CreationBuild;
  onChange: (build: CreationBuild) => void;
}) {
  const theme = useProphecyTheme();
  const left = resourcePointsLeft(build);
  return (
    <SectionCard title="MAÎTRISE ET CHANCE" helper={left ? `Reste ${left}` : undefined}>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>{startLine(build)}</Text>
      {RESOURCES.map((r) => (
        <StepperRow
          key={r.key}
          testID={`resource-${r.key}`}
          label={r.label}
          value={finalResource(build, r.key)}
          canDec={(build.resources[r.key] ?? 0) > 0}
          canInc={left > 0}
          onStep={(d) => onChange({ ...build, resources: stepResource(build, r.key, d) })}
        />
      ))}
    </SectionCard>
  );
}
