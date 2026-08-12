// The editable rows themselves, with no scroll and no filter UI of their own —
// one attribut's worth when the pager renders a page, every match when the
// search overlay renders results. Same list either way, only the scope differs.

import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import SkillRow, { type SpecMother } from '@/components/skills/skill-row';
import SpecRow from '@/components/skills/spec-row';
import type { Skill } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SkillRow as SkillRowData } from '@/lib/character-values';
import {
  groupSpecsByMother,
  orphanGroups,
  visibleRows,
  type SkillScope,
} from '@/lib/skill-grouping';

export default function SkillsEditList({
  rows,
  specs,
  scope,
  onChangeValue,
  onChangeAttribut,
  onRemove,
  onAddSpec,
  onSpecLabel,
  onSpecValue,
  onSpecRemove,
  focusName,
  onFocused,
}: {
  /** The WHOLE draft array — edits are keyed by index into it, not by position here. */
  rows: SkillRowData[];
  /** Live specialization rows (parentName set); grouped under their mother. */
  specs: Skill[];
  scope: SkillScope;
  onChangeValue: (index: number, text: string) => void;
  onChangeAttribut: (index: number, attribut: string) => void;
  onRemove: (index: number) => void;
  onAddSpec: (mother: SpecMother) => void;
  onSpecLabel: (spec: Skill, label: string) => void;
  onSpecValue: (spec: Skill, value: number) => void;
  onSpecRemove: (spec: Skill) => void;
  /** A just-added skill: its value field takes focus when the row mounts (#50). */
  focusName?: string | null;
  onFocused?: () => void;
}) {
  const theme = useProphecyTheme();
  const [menuFor, setMenuFor] = useState<number | null>(null);

  const focusNewSkill = useCallback(
    (el: RNTextInput | null) => {
      if (!el) return;
      // Deferred a frame: focusing during the mount commit can be swallowed
      // while the keyboard is re-anchoring from the search field on Android.
      requestAnimationFrame(() => el.focus());
      onFocused?.();
    },
    [onFocused],
  );

  // Stable so each NumberField keeps the same onChange identity and its
  // React.memo can skip re-rendering untouched rows. NumberField hands back its
  // fieldKey (the row index as a string).
  const onFieldChange = useCallback(
    (key: string, text: string) => onChangeValue(Number(key), text),
    [onChangeValue],
  );

  const specsByMother = groupSpecsByMother(specs);
  const visible = visibleRows(rows, scope);
  const orphans = orphanGroups(rows, specs, scope);

  if (visible.length === 0 && orphans.length === 0) {
    return (
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        {scope.searching ? 'Aucun résultat.' : 'Aucune compétence.'}
      </Text>
    );
  }

  return (
    <View>
      {visible.map(({ row, index }, i) => (
        <View key={`${row.name}-${index}`}>
          {i > 0 && <Divider style={styles.divider} />}
          <SkillRow
            row={row}
            index={index}
            specs={specsByMother.get(row.name) ?? []}
            menuOpen={menuFor === index}
            onOpenMenu={() => setMenuFor(index)}
            onCloseMenu={() => setMenuFor(null)}
            onChangeValue={onFieldChange}
            onChangeAttribut={onChangeAttribut}
            onRemove={onRemove}
            onAddSpec={onAddSpec}
            onSpecLabel={onSpecLabel}
            onSpecValue={onSpecValue}
            onSpecRemove={onSpecRemove}
            inputRef={focusName === row.name ? focusNewSkill : undefined}
          />
        </View>
      ))}

      {orphans.map(([mother, mspecs], gi) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { marginVertical: 6 },
  ghostHeader: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
});
