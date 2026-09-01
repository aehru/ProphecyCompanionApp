import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Divider, Menu, Text, TextInput } from 'react-native-paper';

import Icon, { dsIcon } from '@/components/ui/icon';
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
 *
 * `searchable` puts a filter box at the top of the open menu — for the lists a
 * character grows without limit (an effect's target is every stat PLUS every
 * skill they own, 40+ rows). It scrolls with the options rather than staying
 * pinned: Paper's Menu has no header slot, and the alternative was a second
 * dialog stacked over the first. Taps are handled through the keyboard
 * (`keyboardShouldPersistTaps`), so picking an option while typing takes one
 * tap, not two.
 */
export default function SelectField({
  label,
  options,
  value,
  onChange,
  style,
  searchable = false,
  testID,
}: {
  /** Omit for a label-less field (when a neighbour already titles the row). */
  label?: string;
  options: readonly Option[];
  value: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
  /** Add a filter box above the options. Worth it past ~15 rows. */
  searchable?: boolean;
  /** Stable E2E hook. Each option also gets `<testID>-option-<key>`. */
  testID?: string;
}) {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = options.find((o) => o.key === value);

  // Every open starts from the full list — a stale filter would look like a
  // menu that has lost most of its options.
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      ) : null}
      <Menu
        visible={open}
        onDismiss={close}
        keyboardShouldPersistTaps="handled"
        anchor={
          <Pressable
            accessibilityRole="button"
            testID={testID}
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
        {searchable ? (
          <>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher…"
              dense
              mode="outlined"
              autoCorrect={false}
              testID={testID ? `${testID}-search` : undefined}
              left={<TextInput.Icon icon={dsIcon('search')} />}
              right={
                query ? <TextInput.Icon icon={dsIcon('close')} onPress={() => setQuery('')} /> : undefined
              }
              style={styles.search}
            />
            <Divider />
          </>
        ) : null}
        {searchable && shown.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            Aucun résultat.
          </Text>
        ) : null}
        {shown.map((o) => (
          <Menu.Item
            key={o.key}
            testID={testID ? `${testID}-option-${o.key}` : undefined}
            title={o.label}
            titleStyle={o.key === value ? { color: theme.colors.primary } : undefined}
            trailingIcon={
              o.key === value
                ? ({ size, color }) => <Icon name="check" size={size} color={color} />
                : undefined
            }
            onPress={() => {
              close();
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
  // Menu.Item is 48dp tall with 12dp side padding — match it so the filter box
  // reads as part of the same list.
  search: { marginHorizontal: 12, marginBottom: 4 },
  empty: { paddingHorizontal: 16, paddingVertical: 12 },
  caret: { transform: [{ rotate: '90deg' }] },
});
