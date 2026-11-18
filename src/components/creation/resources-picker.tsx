// MAÎTRISE ET CHANCE: the age gives some points outright and leaves the rest to
// distribute between the two. Shown on the Attributs step.

import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
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
      {RESOURCES.map((r) => {
        const given = build.resources[r.key] ?? 0;
        return (
          <View key={r.key} style={styles.row} testID={`resource-${r.key}`}>
            <Text style={styles.label}>{r.label}</Text>
            <IconButton
              icon="minus"
              mode="outlined"
              size={16}
              disabled={given <= 0}
              accessibilityLabel={`${r.label} moins un`}
              onPress={() => onChange({ ...build, resources: stepResource(build, r.key, -1) })}
            />
            <Text variant="titleMedium" style={styles.value}>
              {finalResource(build, r.key)}
            </Text>
            <IconButton
              icon={dsIcon('plus')}
              mode="outlined"
              size={16}
              disabled={left <= 0}
              accessibilityLabel={`${r.label} plus un`}
              onPress={() => onChange({ ...build, resources: stepResource(build, r.key, 1) })}
            />
          </View>
        );
      })}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, fontSize: 16 },
  value: { minWidth: 32, textAlign: 'center' },
});
