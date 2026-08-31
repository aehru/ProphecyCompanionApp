import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { xpAvailable } from '@/lib/xp';

/**
 * EXPÉRIENCE: the two stored counters (total awarded / total spent) and the
 * disponible derived from them (lib/xp). Read-only until the tab's edit toggle
 * is on, which swaps the two counters for numeric fields — the disponible has
 * no field of its own, since it is not a number anyone stores.
 *
 * Typed rather than stepped: XP arrives in session-sized awards (« +5 PX »),
 * and the app knows no rulebook cost table to step a purchase by. Same reason
 * the money row is fields and the resource pools are −1/+1 buttons.
 */
export default function XpSection({
  valueOf,
  onChange,
  editing,
}: {
  valueOf: (key: string) => number;
  onChange: (key: string, text: string) => void;
  editing: boolean;
}) {
  const theme = useProphecyTheme();
  const total = valueOf('xpTotal');
  const spent = valueOf('xpSpent');
  const available = xpAvailable(total, spent);
  return (
    <SectionCard title="EXPÉRIENCE" icon="arrowup">
      <View style={styles.grid}>
        <StatChip label="Disponible" value={String(available)} style={styles.cell} />
        {editing ? (
          <>
            <NumberField
              fieldKey="xpTotal"
              label="Gagnée"
              value={String(total)}
              onChange={onChange}
              style={styles.cell}
            />
            <NumberField
              fieldKey="xpSpent"
              label="Dépensée"
              value={String(spent)}
              onChange={onChange}
              style={styles.cell}
            />
          </>
        ) : (
          <>
            <StatChip label="Gagnée" value={String(total)} style={styles.cell} />
            <StatChip label="Dépensée" value={String(spent)} style={styles.cell} />
          </>
        )}
      </View>
      {available < 0 ? (
        // Not an error to fix — spending on credit is allowed (see lib/xp) — so
        // this states the debt rather than blocking anything.
        <Text style={{ color: theme.colors.error }}>Dette de {-available} XP</Text>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexGrow: 1, flexBasis: 90, minWidth: 90 },
});
