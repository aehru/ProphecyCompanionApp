import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Menu, Text } from 'react-native-paper';

import Icon from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

type Option = { key: string; label: string };

/**
 * Single-select dropdown shaped exactly like {@link NumberField} — same label
 * above, same 1px outlined box — so the two sit on one row without looking like
 * two different widgets (the spell editor's « Temps d'incantation » does this).
 *
 * Use it over {@link ChipSelect} when the options are many (spheres) or when the
 * field must stay one line tall; chips stay the better read for 2–4 options that
 * deserve to be visible at once.
 */
export default function SelectField({
  label,
  options,
  value,
  onChange,
  style,
}: {
  /** Omit for a label-less field (when a neighbour already titles the row). */
  label?: string;
  options: readonly Option[];
  value: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
}) {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value);

  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      ) : null}
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityValue={{ text: current?.label }}
            onPress={() => setOpen(true)}
            style={[styles.anchor, { borderColor: theme.colors.outline }]}>
            <Text style={styles.value} numberOfLines={1}>
              {current?.label ?? ''}
            </Text>
            {/* No down chevron in the DS set — the right one, quarter-turned. */}
            <View style={styles.caret}>
              <Icon name="chev" size={16} color={theme.colors.onSurfaceVariant} />
            </View>
          </Pressable>
        }
        anchorPosition="bottom">
        {options.map((o) => (
          <Menu.Item
            key={o.key}
            title={o.label}
            titleStyle={o.key === value ? { color: theme.colors.primary } : undefined}
            trailingIcon={
              o.key === value
                ? ({ size, color }) => <Icon name="check" size={size} color={color} />
                : undefined
            }
            onPress={() => {
              setOpen(false);
              if (o.key !== value) onChange(o.key);
            }}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors number-field.tsx — keep the two in step.
  field: { flexGrow: 1, flexBasis: 90, minWidth: 90 },
  label: { fontSize: 12, marginBottom: 2 },
  anchor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  value: { flex: 1, fontSize: 16 },
  caret: { transform: [{ rotate: '90deg' }] },
});
