import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IconButton } from 'react-native-paper';

import SkillsEditor from '@/components/skills-editor';
import SkillsView from '@/components/skills-view';
import { dsIcon } from '@/components/ui/icon';
import { characterFallback } from '@/components/ui/character-gate';
import type { Skill } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { asNumRecord, buildSkillRows, type SkillRow, skillRowsToInput } from '@/lib/character-values';
import { totalModifier, woundMalus } from '@/lib/modifiers';
import { effectsQuery } from '@/repositories/effects';
import { replaceSkills, skillsQuery } from '@/repositories/skills';

export default function CharacterSkillsScreen() {
  const numId = useCharacterId();
  const navigation = useNavigation();
  // Reload on focus so attribut values edited elsewhere keep the totals correct.
  const { char, state } = useCharacterState(numId, { reloadOnFocus: true });
  const { data: skills } = useLiveQuery(skillsQuery(numId));
  const { data: effects } = useLiveQuery(effectsQuery(numId));
  const [editing, setEditing] = useEditToggle(navigation);

  // Toggle lives in the header (a FAB would overlap the sticky filter bar).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon={editing ? dsIcon('check') : dsIcon('edit')}
          onPress={() => setEditing((e) => !e)}
        />
      ),
    });
  }, [navigation, editing, setEditing]);

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  // Wound malus + temporary effects, per linked attribut, for skill totals.
  const wound = woundMalus(asNumRecord(state));
  const effectList = effects ?? [];

  return (
    <View style={styles.container}>
      {editing ? (
        <SkillsEditorLive characterId={numId} skills={skills ?? []} />
      ) : (
        <SkillsView
          skills={skills ?? []}
          attributValue={(a) => rec[a] ?? 0}
          modifier={(a) => totalModifier(a, effectList, wound)}
        />
      )}
    </View>
  );
}

/**
 * Wraps SkillsEditor with live (debounced) auto-save. Rows are seeded once from
 * the saved skills; while editing we own them (single writer) and flush the
 * whole set via replaceSkills after a pause — and once more on unmount so the
 * last edit isn't lost when leaving edit mode.
 */
function SkillsEditorLive({ characterId, skills }: { characterId: number; skills: Skill[] }) {
  const [rows, setRows] = useState<SkillRow[]>(() => buildSkillRows(skills));
  const [search, setSearch] = useState('');

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    replaceSkills(characterId, skillRowsToInput(rowsRef.current));
  }, [characterId]);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);

  // Flush any pending edit when leaving edit mode (component unmounts).
  useEffect(() => flush, [flush]);

  const onChangeValue = useCallback(
    (index: number, t: string) => {
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, value: t } : r)));
      scheduleSave();
    },
    [scheduleSave],
  );
  const onChangeAttribut = useCallback(
    (index: number, attribut: string) => {
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, attribut } : r)));
      scheduleSave();
    },
    [scheduleSave],
  );
  const onAddCustom = useCallback(
    (name: string, attribut: string) => {
      setRows((prev) => [...prev, { name, attribut, value: '', isCustom: true }]);
      setSearch('');
    },
    [],
  );
  const onRemove = useCallback(
    (index: number) => {
      setRows((prev) => prev.filter((_, i) => i !== index));
      scheduleSave();
    },
    [scheduleSave],
  );

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.editContent}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}>
      <SkillsEditor
        rows={rows}
        search={search}
        onSearch={setSearch}
        onChangeValue={onChangeValue}
        onChangeAttribut={onChangeAttribut}
        onAddCustom={onAddCustom}
        onRemove={onRemove}
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  editContent: { padding: 12, gap: 12, paddingBottom: 96 },
});
