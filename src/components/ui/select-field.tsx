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
 * `searchable` puts a filter box above the options — for the lists a character
 * grows without limit (an effect's target is every stat PLUS every skill they
 * own, 40+ rows). Taps are handled through the keyboard, so picking an option
 * while typing takes one tap, not two.
 *
 * `inline` drops the options into the layout under the anchor instead of
 * floating them. **A field inside a dialog needs it**: Paper's `Menu` is a
 * Portal that measures its anchor, and inside another Portal (every DsDialog is
 * one) the open animation lands at scale ~0 — the options are in the tree,
 * sized 18×4px, unreachable. Expanding in place has no anchor to measure and no
 * second Portal to stack, and the dialog body already scrolls, so a long list
 * costs nothing but height.
 */
export default function SelectField({
  label,
  options,
  value,
  onChange,
  style,
  searchable = false,
  inline = false,
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
  /** Expand in place rather than floating a menu. Required inside a dialog. */
  inline?: boolean;
  /** Stable E2E hook. Each option also gets `<testID>-option-<key>`. */
  testID?: string;
}) {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = options.find((o) => o.key === value);

  // Every open starts from the full list — a stale filter would look like a
  // field that has lost most of its options.
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const pick = (key: string) => {
    close();
    if (key !== value) onChange(key);
  };
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  const anchor = (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      accessibilityLabel={label}
      accessibilityValue={{ text: current?.label }}
      accessibilityState={inline ? { expanded: open } : undefined}
      onPress={() => (open ? close() : setOpen(true))}
      style={[styles.anchor, { borderColor: theme.colors.outline }]}>
      <Text style={styles.value} numberOfLines={1}>
        {current?.label ?? ''}
      </Text>
      {/* No down chevron in the DS set — the right one, quarter-turned. */}
      <View style={[styles.caret, inline && open ? styles.caretOpen : null]}>
        <Icon name="chev" size={16} color={theme.colors.onSurfaceVariant} />
      </View>
    </Pressable>
  );

  const search = searchable ? (
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
  ) : null;

  const empty = (
    <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>Aucun résultat.</Text>
  );

  return (
    <View style={[styles.field, inline ? styles.fieldAuto : null, style]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      ) : null}

      {inline ? (
        <>
          {anchor}
          {open ? (
            <View style={[styles.list, { borderColor: theme.prophecy.borderSoft }]}>
              {search}
              {shown.length === 0
                ? empty
                : shown.map((o) => {
                    const selected = o.key === value;
                    return (
                      <Pressable
                        key={o.key}
                        testID={testID ? `${testID}-option-${o.key}` : undefined}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[
                          styles.row,
                          selected && { backgroundColor: theme.colors.secondaryContainer },
                        ]}
                        onPress={() => pick(o.key)}>
                        <Text
                          style={{
                            color: selected ? theme.colors.primary : theme.colors.onSurface,
                            fontWeight: selected ? '700' : '400',
                          }}>
                          {o.label}
                        </Text>
                        {selected ? (
                          <Icon name="check" size={18} color={theme.colors.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
            </View>
          ) : null}
        </>
      ) : (
        <Menu
          visible={open}
          onDismiss={close}
          keyboardShouldPersistTaps="handled"
          anchor={anchor}
          anchorPosition="bottom">
          {searchable ? (
            <>
              {search}
              <Divider />
            </>
          ) : null}
          {searchable && shown.length === 0 ? empty : null}
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
              onPress={() => pick(o.key)}
            />
          ))}
        </Menu>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors number-field.tsx — keep the two in step.
  field: { flexGrow: 1, flexBasis: 90, minWidth: 90 },
  // `flexBasis` runs along the PARENT's main axis, so in a column — a dialog
  // body — the 90 above is a HEIGHT basis, and an expanded list overflows it
  // and draws over the next field. Inline sizes to its content instead; the
  // row-laid-out callers keep their width basis through `style`.
  fieldAuto: { flexBasis: 'auto' },
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
  // Points up once the list is open, the way a folded section's chevron turns.
  caretOpen: { transform: [{ rotate: '270deg' }] },
  // The same list chrome the effect editor's target picker had before it moved
  // in here: hairline box, 10dp radius, rows the width of the field.
  list: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: 4 },
  search: { marginHorizontal: 12, marginTop: 8, marginBottom: 4 },
  empty: { paddingHorizontal: 16, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
