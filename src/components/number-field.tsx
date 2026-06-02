import React from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/**
 * Lightweight numeric field (plain RN TextInput) — far cheaper to mount than
 * Paper's outlined TextInput, so ~20 of them don't jank the screen transition.
 * Memoized so editing one field doesn't re-render its siblings.
 */
const NumberField = React.memo(function NumberField({
  fieldKey,
  label,
  value,
  onChange,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  submitBehavior,
}: {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (key: string, t: string) => void;
  inputRef?: React.Ref<TextInput>;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  submitBehavior?: TextInputProps['submitBehavior'];
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(fieldKey, t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        submitBehavior={submitBehavior}
        style={[styles.input, { borderColor: theme.colors.outline, color: theme.colors.onSurface }]}
      />
    </View>
  );
});

export default NumberField;

const styles = StyleSheet.create({
  field: { flexGrow: 1, flexBasis: 90, minWidth: 90 },
  label: { fontSize: 12, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
});
