import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import SectionCard from '@/components/ui/section-card';
import type { StatutPreset } from '@/data/status-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { rungLabel, rungsUpTo } from '@/lib/statut';

/**
 * What a character's Statut GIVES them, on the character home: the bénéfices in
 * one section, the Techniques in another.
 *
 * Both are CUMULATIVE — every rung climbed, not just the current one. A Maître
 * d'armes still has the Apprenti's « L'œil du maître », so a list showing only
 * the top rung would hide four fifths of what the character can do.
 *
 * Nothing is stored: the lists are derived from `caste` + `statut`, two columns
 * already on the sheet. So a rulebook correction reaches every character the
 * moment the CSV is regenerated, there is nothing to keep in sync, and a Statut
 * changed on the Fiche is reflected here on the next render.
 *
 * Both render NOTHING at Statut 0 or « Sans Caste ». A fresh character would
 * otherwise meet two empty cards, which reads as "not filled in yet" rather than
 * as "does not apply".
 *
 * Both start FOLDED. They are rulebook paragraphs — five of them at Statut 5 —
 * read when a question comes up and in the way the rest of the time, which is
 * exactly what `defaultExpanded={false}` is for. The header still says they are
 * there, and the count of rungs is the character's Statut, already on the chip
 * above.
 */
export function StatutBenefitsSection({
  caste,
  statut,
  darkOrders,
}: {
  caste?: string | null;
  statut?: number | null;
  darkOrders?: boolean | null;
}) {
  const rungs = rungsUpTo(caste, statut, !!darkOrders);
  if (rungs.length === 0) return null;

  return (
    <SectionCard title="BÉNÉFICES" icon="compass" collapsible defaultExpanded={false}>
      {rungs.map((rung) => (
        <RungBlock key={rung.niveau} rung={rung} body={rung.benefice} />
      ))}
    </SectionCard>
  );
}

export function StatutTechniquesSection({
  caste,
  statut,
  darkOrders,
}: {
  caste?: string | null;
  statut?: number | null;
  darkOrders?: boolean | null;
}) {
  const theme = useProphecyTheme();
  // A rung without a Technique is possible in the type, though no rulebook rung
  // is missing one today — so the filter is a guard, not a normal case.
  const rungs = rungsUpTo(caste, statut, !!darkOrders).filter((r) => r.technique);
  if (rungs.length === 0) return null;

  return (
    <SectionCard title="TECHNIQUES" icon="compass" collapsible defaultExpanded={false}>
      {rungs.map((rung) => (
        <RungBlock
          key={rung.niveau}
          rung={rung}
          // The Technique's own name leads, in the gold the Statut chip uses:
          // it is what a player looks up mid-game, where the rung it came from
          // is just provenance.
          heading={
            <Text style={[styles.techniqueName, { color: theme.colors.secondary }]}>
              {rung.technique?.nom}
            </Text>
          }
          body={rung.technique?.effet ?? ''}
        />
      ))}
    </SectionCard>
  );
}

/** One rung's line: where it came from, then what it says. */
function RungBlock({
  rung,
  heading,
  body,
}: {
  rung: StatutPreset;
  heading?: React.ReactNode;
  body: string;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={[styles.block, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Text style={[styles.rung, { color: theme.colors.onSurfaceVariant }]}>{rungLabel(rung)}</Text>
      {heading}
      <Text style={[styles.body, { color: theme.colors.onSurface }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // A hairline between rungs rather than a card each: this is a read-only list
  // on a dashboard, and five bordered boxes would out-shout the vitals above.
  block: { gap: 3, paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1 },
  rung: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  techniqueName: { fontSize: 13, fontFamily: 'Cinzel_600SemiBold' },
  body: { fontSize: 13, lineHeight: 19 },
});
