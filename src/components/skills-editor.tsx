import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Menu, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SkillFilterBar from '@/components/skill-filter-bar';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUTS, ATTRIBUT_LABEL } from '@/constants/prophecy';
import type { Skill } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useSkillFilter } from '@/hooks/use-skill-filter';
import type { SkillRow } from '@/lib/character-values';

/** Seed data for a new specialization: the mother's current name/attribut/value. */
export type SpecMother = { name: string; attribut: string; value: number };

/**
 * Edit a character's skills. Skills are grouped into one tab per attribut to
 * avoid a long scroll; the search bar filters across ALL attributs (global) and
 * overrides the active tab. No match → add a free (custom) skill. Skills left at
 * 0 are not saved.
 */
export default function SkillsEditor({
  rows,
  specs,
  search,
  onSearch,
  onChangeValue,
  onChangeAttribut,
  onAddCustom,
  onRemove,
  onAddSpec,
  onSpecLabel,
  onSpecValue,
  onSpecRemove,
}: {
  rows: SkillRow[];
  // Live specialization rows (parentName set); grouped under their mother.
  specs: Skill[];
  search: string;
  onSearch: (t: string) => void;
  onChangeValue: (index: number, t: string) => void;
  onChangeAttribut: (index: number, attribut: string) => void;
  onAddCustom: (name: string, attribut: string) => void;
  onRemove: (index: number) => void;
  onAddSpec: (mother: SpecMother) => void;
  onSpecLabel: (spec: Skill, label: string) => void;
  onSpecValue: (spec: Skill, value: number) => void;
  onSpecRemove: (spec: Skill) => void;
}) {
  const theme = useProphecyTheme();
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const { activeAttr, setActiveAttr, q, searching, title } = useSkillFilter({
    value: search,
    onChange: onSearch,
  });

  const specsByMother = new Map<string, Skill[]>();
  for (const s of specs) {
    if (s.parentName) {
      const list = specsByMother.get(s.parentName) ?? [];
      list.push(s);
      specsByMother.set(s.parentName, list);
    }
  }

  // Stable so each NumberField keeps the same onChange identity and its
  // React.memo can skip re-rendering untouched rows. NumberField hands back its
  // fieldKey (the row index as a string).
  const onFieldChange = useCallback(
    (key: string, t: string) => onChangeValue(Number(key), t),
    [onChangeValue],
  );

  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      searching ? row.name.toLowerCase().includes(q) : row.attribut === activeAttr,
    );

  const exactMatch = rows.some((r) => r.name.trim().toLowerCase() === q);
  const canAdd = searching && !exactMatch;

  // Specializations whose mother isn't shown as a base row (mother not in the
  // catalogue and not owned — e.g. a removed custom skill) are grouped under a
  // greyed "non acquise" ghost header so they stay visible and editable.
  const coveredNames = new Set(rows.map((r) => r.name));
  const orphanByMother = new Map<string, Skill[]>();
  for (const s of specs) {
    if (!s.parentName || coveredNames.has(s.parentName)) continue;
    const inTab = searching
      ? s.parentName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      : s.attribut === activeAttr;
    if (!inTab) continue;
    const list = orphanByMother.get(s.parentName) ?? [];
    list.push(s);
    orphanByMother.set(s.parentName, list);
  }
  const orphanGroups = [...orphanByMother.entries()];

  return (
    <View style={styles.root}>
      <SkillFilterBar
        search={search}
        onSearch={onSearch}
        activeAttr={activeAttr}
        onAttr={setActiveAttr}
      />

      {canAdd ? (
        <Button
          icon={dsIcon('plus')}
          mode="outlined"
          onPress={() => onAddCustom(search.trim(), searching ? ATTRIBUTS[0].key : activeAttr)}>
          Ajouter « {search.trim()} »
        </Button>
      ) : null}

      <SectionCard title={title}>
        {visible.map(({ row, index }, i) => {
          const rowSpecs = specsByMother.get(row.name) ?? [];
          return (
            <View key={`${row.name}-${index}`}>
              {i > 0 && <Divider style={styles.divider} />}
              <View style={styles.row}>
                <View style={styles.nameCol}>
                  <Text numberOfLines={1}>{row.name}</Text>
                  <Menu
                    visible={menuFor === index}
                    onDismiss={() => setMenuFor(null)}
                    anchor={
                      <Button
                        compact
                        mode="text"
                        onPress={() => setMenuFor(index)}
                        labelStyle={styles.attrLabel}>
                        {ATTRIBUT_LABEL[row.attribut] ?? '—'}
                      </Button>
                    }>
                    {ATTRIBUTS.map((a) => (
                      <Menu.Item
                        key={a.key}
                        title={a.label}
                        onPress={() => {
                          onChangeAttribut(index, a.key);
                          setMenuFor(null);
                        }}
                      />
                    ))}
                  </Menu>
                </View>

                <NumberField
                  fieldKey={String(index)}
                  label="Valeur"
                  value={row.value}
                  style={styles.valueField}
                  onChange={onFieldChange}
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

              {rowSpecs.map((spec) => (
                <SpecRow
                  key={spec.id}
                  spec={spec}
                  onLabel={onSpecLabel}
                  onValue={onSpecValue}
                  onRemove={onSpecRemove}
                />
              ))}

              {/* A specialization may be added even without owning the mother
                  (GM's call); it's seeded from the mother's current value (0 if
                  not owned). */}
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
                Spécialisation
              </Button>
            </View>
          );
        })}

        {orphanGroups.map(([mother, mspecs], gi) => (
          <View key={`ghost-${mother}`}>
            {(visible.length > 0 || gi > 0) && <Divider style={styles.divider} />}
            <Text style={[styles.ghostHeader, { color: theme.colors.onSurfaceVariant }]}>
              {mother} · non acquise
            </Text>
            {mspecs.map((spec) => (
              <SpecRow
                key={spec.id}
                spec={spec}
                onLabel={onSpecLabel}
                onValue={onSpecValue}
                onRemove={onSpecRemove}
              />
            ))}
          </View>
        ))}

        {visible.length === 0 && orphanGroups.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {searching ? 'Aucun résultat.' : 'Aucune compétence.'}
          </Text>
        ) : null}
      </SectionCard>
    </View>
  );
}

/**
 * One specialization line under its mother. Manages its own debounced local
 * state (like the base rows) so typing the label/value doesn't hammer the DB;
 * the label rename recomputes the composite name + rewrites effect targets in
 * the repository.
 */
function SpecRow({
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
      <TextInput
        label="Spécialisation"
        value={label}
        onChangeText={setLabel}
        mode="outlined"
        dense
        style={styles.specLabelField}
      />
      <NumberField
        fieldKey={`spec-${spec.id}`}
        label="Valeur"
        value={value}
        style={styles.valueField}
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
  root: { gap: 8 },
  divider: { marginVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nameCol: { flex: 1, gap: 2 },
  valueField: { flexGrow: 0, flexBasis: 'auto', minWidth: 0, width: 64 },
  attrLabel: { fontSize: 12, marginHorizontal: 0 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, marginTop: 6 },
  specArrow: { fontSize: 16 },
  specLabelField: { flex: 1 },
  ghostHeader: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  addSpec: { alignSelf: 'flex-start', marginTop: 2 },
  addSpecLabel: { fontSize: 12, marginHorizontal: 4 },
});
