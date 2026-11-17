import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { PRIVILEGE_FAMILIES } from '@/constants/prophecy';
import type { Privilege } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { privilegeOffCaste } from '@/lib/privilege';
import { traitCostLabel } from '@/lib/trait-pool';
import { privilegesQuery } from '@/repositories/privileges';

/**
 * The character home's Privilèges, under the Statut's Techniques: what the
 * player bought from their caste, grouped by the rulebook's two headings. A row
 * the character no longer qualifies for (caste changed, oath broken) stays and
 * is badged « Hors caste ».
 */
export default function PrivilegesSection({
  characterId,
  caste,
  darkOrders,
}: {
  characterId: number;
  caste?: string | null;
  darkOrders?: boolean | null;
}) {
  const router = useRouter();
  const { data } = useLiveQuery(privilegesQuery(characterId), [characterId]);
  const rows = data ?? [];
  // Nothing taken and nothing to take: a « Sans Caste » character gets no card.
  if (rows.length === 0 && !caste) return null;

  return (
    <SectionCard title="PRIVILÈGES" icon="plusminus" collapsible>
      {PRIVILEGE_FAMILIES.map((f) => {
        const list = rows.filter((r) => r.family === f.key);
        if (list.length === 0) return null;
        return (
          <React.Fragment key={f.key}>
            {list.map((r) => (
              <PrivilegeRow
                key={r.id}
                row={r}
                offCaste={privilegeOffCaste(r, caste, darkOrders)}
                onPress={() => router.push(`/character/${characterId}/privilege/${r.id}`)}
              />
            ))}
          </React.Fragment>
        );
      })}
      {caste ? (
        <Button
          mode="outlined"
          icon={dsIcon('plus')}
          onPress={() => router.push(`/character/${characterId}/privilege/catalog`)}>
          Ajouter
        </Button>
      ) : null}
    </SectionCard>
  );
}

function PrivilegeRow({
  row,
  offCaste,
  onPress,
}: {
  row: Privilege;
  offCaste: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  const muted = theme.colors.onSurfaceVariant;
  const family = PRIVILEGE_FAMILIES.find((f) => f.key === row.family)?.label ?? row.family;
  // Same block as the Statut's Techniques: provenance line, gold name, then the
  // rulebook paragraph. The player's précision rides after the name.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Modifier ce privilège"
      onPress={onPress}
      style={[styles.block, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Text style={[styles.label, { color: muted }]}>
        {[family, traitCostLabel([row.cost]), row.darkOrders ? 'Ordres Noirs' : '']
          .filter(Boolean)
          .join(' · ')}
        {offCaste ? <Text style={{ color: theme.colors.error }}> · Hors caste</Text> : null}
      </Text>
      <Text
        style={[styles.name, { color: offCaste ? muted : theme.colors.secondary }]}>
        {row.name}
        {row.note.trim() ? <Text style={[styles.note, { color: muted }]}> — {row.note.trim()}</Text> : null}
      </Text>
      <Text style={[styles.body, { color: theme.colors.onSurface }]}>{row.description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Mirrors statut-sections' RungBlock.
  block: { gap: 3, paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1 },
  label: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  name: { fontSize: 13, fontFamily: 'Cinzel_600SemiBold' },
  note: { fontSize: 12, fontFamily: 'NotoSans_400Regular', fontStyle: 'italic' },
  body: { fontSize: 13, lineHeight: 19 },
});
