// One base skill row in the editor: the attribut chip (which is also the
// re-link menu), the name, the value field, a remove button for custom skills,
// then its specializations and the button that adds one.

import React from 'react';
import { StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { Button, IconButton, Menu, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import { skillFieldStyles } from '@/components/skills/skill-field-styles';
import SpecRow from '@/components/skills/spec-row';
import { dsIcon } from '@/components/ui/icon';
import { ATTRIBUTS, ATTRIBUT_LABEL } from '@/constants/prophecy';
import type { Skill } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SkillRow as SkillRowData } from '@/lib/character-values';

/** Seed data for a new specialization: the mother's current name/attribut/value. */
export type SpecMother = { name: string; attribut: string; value: number };

export default function SkillRow({
  row,
  index,
  specs,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onChangeValue,
  onChangeAttribut,
  onRemove,
  onAddSpec,
  onSpecLabel,
  onSpecValue,
  onSpecRemove,
  inputRef,
}: {
  row: SkillRowData;
  /** Index in the editor's row array — edits are index-keyed. */
  index: number;
  specs: Skill[];
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onChangeValue: (key: string, text: string) => void;
  onChangeAttribut: (index: number, attribut: string) => void;
  onRemove: (index: number) => void;
  onAddSpec: (mother: SpecMother) => void;
  onSpecLabel: (spec: Skill, label: string) => void;
  onSpecValue: (spec: Skill, value: number) => void;
  onSpecRemove: (spec: Skill) => void;
  /** Set on a freshly-added row only — an inline ref on every row would defeat
   *  NumberField's memo. */
  inputRef?: (el: RNTextInput | null) => void;
}) {
  const theme = useProphecyTheme();
  return (
    <View>
      <View style={styles.row}>
        {/* Leading 3-letter attribut chip = the re-link menu (compact rows). */}
        <Menu
          visible={menuOpen}
          onDismiss={onCloseMenu}
          anchor={
            <Button compact mode="text" onPress={onOpenMenu} labelStyle={styles.attrLabel}>
              {(ATTRIBUT_LABEL[row.attribut] ?? '—').slice(0, 3)}
            </Button>
          }>
          {ATTRIBUTS.map((a) => (
            <Menu.Item
              key={a.key}
              title={a.label}
              onPress={() => {
                onChangeAttribut(index, a.key);
                onCloseMenu();
              }}
            />
          ))}
        </Menu>

        <Text numberOfLines={1} style={styles.nameCol}>
          {row.name}
        </Text>

        <NumberField
          fieldKey={String(index)}
          value={row.value}
          style={skillFieldStyles.valueField}
          onChange={onChangeValue}
          inputRef={inputRef}
        />

        {row.isCustom ? (
          <IconButton
            icon={dsIcon('close')}
            size={20}
            iconColor={theme.colors.error}
            onPress={() => onRemove(index)}
          />
        ) : null}
      </View>

      {specs.map((spec) => (
        <SpecRow
          key={spec.id}
          spec={spec}
          onLabel={onSpecLabel}
          onValue={onSpecValue}
          onRemove={onSpecRemove}
        />
      ))}

      {/* A specialization may be added even without owning the mother (GM's
          call); it's seeded from the mother's current value (0 if not owned). */}
      <Button
        compact
        mode="text"
        icon={dsIcon('plus')}
        onPress={() =>
          onAddSpec({
            name: row.name,
            attribut: row.attribut,
            value: parseInt(row.value, 10) || 0,
          })
        }
        style={styles.addSpec}
        labelStyle={styles.addSpecLabel}>
        Spé
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  // Single line (attr chip · name · value): center instead of flex-start.
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameCol: { flex: 1 },
  attrLabel: { fontSize: 12, marginHorizontal: 0 },
  addSpec: { alignSelf: 'flex-start', marginTop: 2 },
  addSpecLabel: { fontSize: 12, marginHorizontal: 4 },
});
