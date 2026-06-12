import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Menu, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SkillFilterBar from '@/components/skill-filter-bar';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUTS, ATTRIBUT_LABEL } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SkillRow } from '@/lib/character-values';

/**
 * Edit a character's skills. Skills are grouped into one tab per attribut to
 * avoid a long scroll; the search bar filters across ALL attributs (global) and
 * overrides the active tab. No match → add a free (custom) skill. Skills left at
 * 0 are not saved.
 */
export default function SkillsEditor({
  rows,
  search,
  onSearch,
  onChangeValue,
  onChangeAttribut,
  onAddCustom,
  onRemove,
}: {
  rows: SkillRow[];
  search: string;
  onSearch: (t: string) => void;
  onChangeValue: (index: number, t: string) => void;
  onChangeAttribut: (index: number, attribut: string) => void;
  onAddCustom: (name: string, attribut: string) => void;
  onRemove: (index: number) => void;
}) {
  const theme = useProphecyTheme();
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [activeAttr, setActiveAttr] = useState<string>(ATTRIBUTS[0].key);

  const q = search.trim().toLowerCase();
  const searching = q !== '';
  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      searching ? row.name.toLowerCase().includes(q) : row.attribut === activeAttr,
    );

  const exactMatch = rows.some((r) => r.name.trim().toLowerCase() === q);
  const canAdd = searching && !exactMatch;

  const title = searching ? 'RÉSULTATS' : (ATTRIBUT_LABEL[activeAttr] ?? 'COMPÉTENCES').toUpperCase();

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
          icon="plus"
          mode="outlined"
          onPress={() => onAddCustom(search.trim(), searching ? ATTRIBUTS[0].key : activeAttr)}>
          Ajouter « {search.trim()} »
        </Button>
      ) : null}

      <SectionCard title={title}>
        {visible.map(({ row, index }, i) => (
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
                onChange={(k, t) => onChangeValue(Number(k), t)}
              />

              {row.isCustom ? (
                <IconButton
                  icon="close"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => onRemove(index)}
                />
              ) : null}
            </View>
          </View>
        ))}

        {visible.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {searching ? 'Aucun résultat.' : 'Aucune compétence.'}
          </Text>
        ) : null}
      </SectionCard>
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
});
