import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import SectionCard from '@/components/ui/section-card';
import type { ActualState } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { txt } from '@/lib/character-values';

/**
 * États / conditions + free notes on the résumé tab. Read view shows the stored
 * text; edit view (driven by the tab-level edit toggle) swaps in the two inputs,
 * persisted live (debounced).
 */
export default function ConditionsCard({
  state,
  editing,
  onPersist,
}: {
  state: ActualState;
  editing: boolean;
  onPersist: (patch: Partial<ActualState>) => void;
}) {
  const theme = useProphecyTheme();
  const [conditions, setConditions] = useDebouncedText(state.conditions, (t) =>
    onPersist({ conditions: t }),
  );
  const [notes, setNotes] = useDebouncedText(state.notes, (t) => onPersist({ notes: t }));

  return (
    <SectionCard title="ÉTATS / NOTES">
      {editing ? (
        <>
          <TextInput
            label="États / conditions"
            value={conditions}
            onChangeText={setConditions}
            mode="outlined"
            multiline
          />
          <TextInput label="Notes" value={notes} onChangeText={setNotes} mode="outlined" multiline />
        </>
      ) : (
        <>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
            États / conditions
          </Text>
          <Text>{txt(state.conditions)}</Text>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Notes</Text>
          <Text>{txt(state.notes)}</Text>
        </>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12 },
});
