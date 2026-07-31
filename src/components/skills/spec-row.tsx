// One specialization line under its mother skill. Manages its own debounced
// local state (like the base rows) so typing the label/value doesn't hammer the
// DB; the label rename recomputes the composite name + rewrites effect targets
// in the repository.

import React from 'react';
import { StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import { dsIcon } from '@/components/ui/icon';
import type { Skill } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { skillFieldStyles } from '@/components/skills/skill-field-styles';

export default function SpecRow({
  spec,
  onLabel,
  onValue,
  onRemove,
}: {
  spec: Skill;
  onLabel: (spec: Skill, label: string) => void;
  onValue: (spec: Skill, value: number) => void;
  onRemove: (spec: Skill) => void;
}) {
  const theme = useProphecyTheme();
  const [label, setLabel] = useDebouncedText(spec.specLabel ?? '', (t) => onLabel(spec, t));
  const [value, setValue] = useDebouncedText(String(spec.value), (t) =>
    onValue(spec, parseInt(t, 10) || 0),
  );

  return (
    <View style={styles.specRow}>
      <Text style={[styles.specArrow, { color: theme.colors.onSurfaceVariant }]}>↳</Text>
      {/* Plain input matching NumberField's box — Paper's outlined field is far
          taller and carries a floating label the compact rows don't need. */}
      <RNTextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Spécialisation"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        style={[
          styles.specInput,
          { borderColor: theme.colors.outline, color: theme.colors.onSurface },
        ]}
      />
      <NumberField
        fieldKey={`spec-${spec.id}`}
        value={value}
        style={skillFieldStyles.valueField}
        onChange={(_, t) => setValue(t)}
      />
      <IconButton
        icon={dsIcon('close')}
        size={20}
        iconColor={theme.colors.error}
        onPress={() => onRemove(spec)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, marginTop: 6 },
  specArrow: { fontSize: 16 },
  // Mirror of number-field's input box so the two fields sit flush on the row.
  specInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
});
