import React, { useCallback, useRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * Lightweight numeric field (plain RN TextInput) — far cheaper to mount than
 * Paper's outlined TextInput, so ~20 of them don't jank the screen transition.
 * Memoized so editing one field doesn't re-render its siblings.
 */
const NumberField = React.memo(function NumberField({
  fieldKey,
  label,
  value,
  style,
  onChange,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  submitBehavior,
  signed = false,
}: {
  fieldKey: string;
  label: string;
  value: string;
  style?: ViewStyle;
  onChange: (key: string, t: string) => void;
  inputRef?: React.Ref<TextInput>;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  submitBehavior?: TextInputProps['submitBehavior'];
  // Allow a leading minus for signed values (e.g. initiative modifiers).
  signed?: boolean;
}) {
  const theme = useProphecyTheme();
  // Keep our own handle to the native input (to select-all on focus) while still
  // forwarding the caller's inputRef used for keyboard "next" chaining.
  const innerRef = useRef<TextInput | null>(null);
  const setRefs = useCallback(
    (el: TextInput | null) => {
      innerRef.current = el;
      if (typeof inputRef === 'function') inputRef(el);
      else if (inputRef) (inputRef as React.MutableRefObject<TextInput | null>).current = el;
    },
    [inputRef],
  );
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <TextInput
        ref={setRefs}
        value={value}
        onChangeText={(t) =>
          onChange(
            fieldKey,
            // Strip non-digits; for signed values keep a single leading minus.
            signed ? t.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '') : t.replace(/[^0-9]/g, ''),
          )
        }
        keyboardType={signed ? 'numbers-and-punctuation' : 'number-pad'}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        submitBehavior={submitBehavior}
        // Select the whole value on entry so the next keystroke overwrites it.
        // Deferred a frame: a synchronous setSelection in onFocus gets clobbered
        // by the cursor-to-end that focus applies on Android.
        onFocus={() => requestAnimationFrame(() => innerRef.current?.setSelection(0, value.length))}
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
