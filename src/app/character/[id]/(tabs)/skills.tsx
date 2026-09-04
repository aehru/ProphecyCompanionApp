import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useNavigation } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';

import type { SkillLineData } from '@/components/campaign/skill-groups-view';
import AddSkillDialog from '@/components/skills/add-skill-dialog';
import SkillsEditList from '@/components/skills/skills-edit-list';
import SkillsReadPage from '@/components/skills/skills-read-page';
import SkillsSearchOverlay from '@/components/skills/skills-search-overlay';
import SkillsSearchResults from '@/components/skills/skills-search-results';
import type { SpecMother } from '@/components/skills/skill-row';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import { dsIcon } from '@/components/ui/icon';
import TabPage from '@/components/ui/tab-page';
import TabPager from '@/components/ui/tab-pager';
import { ATTRIBUTS } from '@/constants/prophecy';
import type { Skill } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { openRoller } from '@/lib/dice-roller';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { useSkillGroups } from '@/hooks/use-skill-groups';
import { useSkillsDraft } from '@/hooks/use-skills-draft';
import { asNumRecord } from '@/lib/character-values';
import { woundMalus } from '@/lib/modifiers';
import { skillRollContext } from '@/lib/roll-context';
import type { SkillScope } from '@/lib/skill-grouping';
import { effectsQuery } from '@/repositories/effects';
import {
  createSpecialization,
  deleteSpecialization,
  renameSpecialization,
  skillsQuery,
  updateSkillValue,
} from '@/repositories/skills';

/** Short forms for a narrow strip / large font scale (see <SubTabs>). */
const SHORT: Record<string, string> = {
  physique: 'Phys.',
  mental: 'Ment.',
  manuel: 'Manu.',
  social: 'Soc.',
};
const TABS = ATTRIBUTS.map((a) => ({ full: a.label, short: SHORT[a.key] ?? a.label }));

/**
 * Compétences tab — one page per attribut, read or edit, plus a global search.
 *
 * The pager is the screen: it stays mounted across the read/edit toggle (which
 * is why the draft rows are hoisted into `useSkillsDraft`), so switching to edit
 * keeps the attribut and the scroll position the user was on. Search is the one
 * thing that isn't per-attribut, so it opens as a layer over the pager instead
 * of living inside a page.
 */
export default function CharacterSkillsScreen() {
  const numId = useCharacterId();
  const navigation = useNavigation();
  // Reload on focus so attribut values edited elsewhere keep the totals correct.
  const { char, state } = useCharacterState(numId, { reloadOnFocus: true });
  const { data: skills } = useLiveQuery(skillsQuery(numId), [numId]);
  const { data: effects } = useLiveQuery(effectsQuery(numId), [numId]);
  const [editing, setEditing] = useEditToggle(navigation);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  // The add dialog's prefilled name, or null when it is closed: the FAB opens it
  // blank, the search's add button opens it on the query.
  const [addingName, setAddingName] = useState<string | null>(null);
  // A just-added custom skill: its value field grabs focus when its row mounts.
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);

  const skillList = skills ?? [];
  const effectList = effects ?? [];
  const rec = asNumRecord(char);
  // Wound malus + temporary effects, per linked attribut, for skill totals.
  const wound = woundMalus(asNumRecord(state));

  const draft = useSkillsDraft(numId, skillList, editing);
  const pageGroups = useSkillGroups({
    skills: skillList,
    attributs: rec,
    effects: effectList,
    wound,
  });

  // Tapping a TOT rolls against that skill — see lib/roll-context for why the
  // total and the confirmation number are not the same one.
  const rollSkill = useCallback(
    (skill: SkillLineData) => openRoller(skillRollContext(skill)),
    [],
  );

  const clearFocus = useCallback(() => setPendingFocus(null), []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearch('');
  }, []);

  const { addCustom, flush } = draft;
  const addSkill = useCallback(
    (name: string, attribut: string) => {
      // Follow the new row to its tab (the dialog can pick another attribut, and
      // a row added out of sight can't take focus), and leave the search.
      const index = ATTRIBUTS.findIndex((a) => a.key === attribut);
      if (index >= 0) setTab(index);
      closeSearch();
      addCustom(name, attribut);
      setPendingFocus(name);
    },
    [addCustom, closeSearch],
  );

  // Specialization CRUD writes live (own table partition; the base flush never
  // touches these rows). Label rename recomputes the composite name + rewrites
  // any effect targeting it, in the repository.
  const onAddSpec = useCallback(
    (mother: SpecMother) => {
      // Flush pending base edits first so the mother is persisted with its value.
      flush();
      createSpecialization(numId, mother);
    },
    [numId, flush],
  );
  const onSpecLabel = useCallback((spec: Skill, label: string) => renameSpecialization(spec, label), []);
  const onSpecValue = useCallback((spec: Skill, value: number) => updateSkillValue(spec.id, value), []);
  const onSpecRemove = useCallback((spec: Skill) => deleteSpecialization(spec), []);

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  // Specializations are managed live, not through the wholesale base flush.
  const specs = skillList.filter((s) => s.parentName != null);
  const q = search.trim().toLowerCase();
  const existingNames = new Set(draft.rows.map((r) => r.name.trim().toLowerCase()));

  const editList = (scope: SkillScope) => (
    <SkillsEditList
      rows={draft.rows}
      specs={specs}
      scope={scope}
      onChangeValue={draft.setValue}
      onChangeAttribut={draft.setAttribut}
      onRemove={draft.remove}
      onAddSpec={onAddSpec}
      onSpecLabel={onSpecLabel}
      onSpecValue={onSpecValue}
      onSpecRemove={onSpecRemove}
      focusName={pendingFocus}
      onFocused={clearFocus}
    />
  );

  // One page per attribut; each owns its vertical scroll under the pinned strip,
  // and a horizontal swipe moves between them.
  const renderPage = (index: number) => {
    const attr = ATTRIBUTS[index];
    return (
      <TabPage>
        {editing
          ? editList({ searching: false, query: '', activeAttr: attr.key })
          : (
            <SkillsReadPage
              group={pageGroups.find((g) => g.key === attr.key)}
              attrVal={rec[attr.key] ?? 0}
              onRoll={rollSkill}
            />
          )}
      </TabPage>
    );
  };

  // Nothing matched what was typed: offer to make it a free skill, prefilling
  // the dialog with the query. Edit mode only — the read view adds nothing.
  const canAdd = editing && q !== '' && !existingNames.has(q);

  // Search spans every attribut: the editor filters its own rows globally, the
  // read view groups the matches into one titled section per attribut.
  const results = editing ? (
    editList({ searching: true, query: q, activeAttr: ATTRIBUTS[tab].key })
  ) : (
    <SkillsSearchResults
      skills={skillList}
      attributs={rec}
      effects={effectList}
      wound={wound}
      query={search}
    />
  );

  return (
    <View style={styles.root}>
      <TabPager
        labels={TABS}
        active={tab}
        onChange={setTab}
        renderPage={renderPage}
        headerRight={
          <IconButton
            icon={dsIcon('search')}
            size={20}
            style={styles.searchButton}
            accessibilityLabel="Rechercher une compétence"
            onPress={() => setSearchOpen(true)}
          />
        }
      />

      {searchOpen ? (
        <SkillsSearchOverlay
          value={search}
          onChange={setSearch}
          onClose={closeSearch}
          action={
            canAdd ? (
              <Button
                icon={dsIcon('plus')}
                mode="outlined"
                onPress={() => setAddingName(search.trim())}>
                Ajouter « {search.trim()} »
              </Button>
            ) : null
          }>
          {results}
        </SkillsSearchOverlay>
      ) : null}

      {/* Edit toggle is the primary FAB; adding a skill stacks above it, the
          same pairing the Magie tab uses. */}
      {editing ? <AppFab icon={dsIcon('plus')} onPress={() => setAddingName('')} offset={72} /> : null}
      <AppFab
        icon={editing ? dsIcon('check') : dsIcon('edit')}
        onPress={() => setEditing((e) => !e)}
      />

      <AddSkillDialog
        visible={addingName !== null}
        onDismiss={() => setAddingName(null)}
        onAdd={addSkill}
        defaultName={addingName ?? ''}
        defaultAttribut={ATTRIBUTS[tab].key}
        existingNames={existingNames}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchButton: { margin: 0, marginRight: 4, marginBottom: 2 },
});
