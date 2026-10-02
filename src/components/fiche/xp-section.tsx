import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import ScenarioDialog, { type ScenarioDialogMode } from '@/components/xp/scenario-dialog';
import { VALEURS } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { xpAvailable, xpEarned } from '@/lib/xp';
import { endScenario, startScenario, xpAwardsQuery } from '@/repositories/xp-awards';

/**
 * EXPÉRIENCE: what has been earned (the hand-typed base plus every closed
 * scénario, lib/xp), what has been spent, and the disponible between them.
 * Read-only until the tab's edit toggle is on, which swaps in fields for the
 * two stored counters — the base (« XP initiale ») and the spend.
 *
 * Below, the current scénario: « Début » stakes a Valeur, « Fin » takes the GM's
 * scores. Players only — an NPC earns no Expérience at the table — and the full
 * list lives on its own screen, since it grows by one row a session.
 */
export default function XpSection({
  characterId,
  valueOf,
  onChange,
  editing,
  scenarios,
}: {
  characterId: number;
  valueOf: (key: string) => number;
  onChange: (key: string, text: string) => void;
  editing: boolean;
  /** Show the scénario tracking (player characters). */
  scenarios: boolean;
}) {
  const theme = useProphecyTheme();
  const router = useRouter();
  const { data: awards } = useLiveQuery(xpAwardsQuery(characterId), [characterId]);
  const [dialog, setDialog] = useState<ScenarioDialogMode | null>(null);

  const base = valueOf('xpTotal');
  const spent = valueOf('xpSpent');
  const earned = xpEarned(base, awards ?? []);
  const available = xpAvailable(earned, spent);
  const open = awards?.find((a) => !a.endedAt);

  return (
    <SectionCard title="EXPÉRIENCE" icon="arrowup">
      <View style={styles.grid}>
        <StatChip label="Disponible" value={String(available)} style={styles.cell} />
        {editing ? (
          <>
            <NumberField
              fieldKey="xpTotal"
              label="XP initiale"
              value={String(base)}
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
            <StatChip label="Gagnée" value={String(earned)} style={styles.cell} />
            <StatChip label="Dépensée" value={String(spent)} style={styles.cell} />
          </>
        )}
      </View>
      {available < 0 ? (
        // Not an error to fix — spending on credit is allowed (see lib/xp) — so
        // this states the debt rather than blocking anything.
        <Text style={{ color: theme.colors.error }}>Dette de {-available} XP</Text>
      ) : null}

      {scenarios ? (
        <>
          {open ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              En cours{open.label ? ` : ${open.label}` : ''} — Valeur choisie :{' '}
              {VALEURS.find((v) => v.key === open.chosenValeur)?.label}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => router.push(`/character/${characterId}/xp`)}>
              Historique ({awards?.length ?? 0})
            </Button>
            <Button mode="contained" onPress={() => setDialog(open ? 'end' : 'start')}>
              {open ? 'Fin de scénario' : 'Début de scénario'}
            </Button>
          </View>
          {dialog ? (
            <ScenarioDialog
              mode={dialog}
              initial={open}
              onDismiss={() => setDialog(null)}
              onSubmit={async (v) => {
                setDialog(null);
                if (open) await endScenario(open.id, v.scores);
                else await startScenario(characterId, v.chosenValeur, v.label);
              }}
            />
          ) : null}
        </>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexGrow: 1, flexBasis: 90, minWidth: 90 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
});
