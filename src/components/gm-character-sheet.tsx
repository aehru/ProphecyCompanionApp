import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Modal, Portal, Text } from 'react-native-paper';

import NpcGearSections from '@/components/campaign/npc-gear-sections';
import NpcInPlayEditor from '@/components/campaign/npc-in-play-editor';
import { useAttrColors, useTendColors } from '@/components/campaign/roster-accents';
import { PlayerAvatar } from '@/components/campaign/roster-badges';
import SkillGroupsView, { type SkillLineData } from '@/components/campaign/skill-groups-view';
import { AttrTile, CaracTile } from '@/components/campaign/stat-tiles';
import {
  EffectsList,
  GmNotes,
  InitiativeChips,
  ResourceTiles,
  TendanceRings,
} from '@/components/campaign/sheet-parts';
import Section from '@/components/campaign/sheet-section';
import { ATTRIBUTS, CARACTERISTIQUES } from '@/constants/prophecy';
import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useLocalDieIcons } from '@/hooks/use-local-die-icons';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import GlobalModifierRow from '@/components/global-modifier-row';

import { sharedStatRollContext } from '@/lib/campaign-roll';
import { openRoller } from '@/lib/dice-roller';
import { globalModifier, statModifier } from '@/lib/modifiers';
import { skillRollContext } from '@/lib/roll-context';
import { groupSkills } from '@/lib/skill-groups';
import { effectsOf, nums, pools, skillsOf, woundOf } from '@/lib/shared-character-view';

interface Props {
  entry: RosterEntry | null;
  note: string;
  onSaveNote: (charUuid: string, body: string) => void;
  /** Spawn another of this PNJ (GM-owned entries only). Omit to hide the action. */
  onDuplicate?: (charUuid: string) => void;
  /** Open a GM-owned entry straight in edit mode (the initiative order does). */
  startEditing?: boolean;
  onDismiss: () => void;
}

/**
 * GM-only bottom sheet: the full shared projection of one roster character plus
 * the GM's private notes, which never leave this device.
 *
 * A player's character is read-only AND limited to the projection — the protocol
 * is one-way and the projection is the privacy boundary. The GM's OWN NPCs
 * (`owner === 'gm'`) get two things more, both reaching past the projection to
 * the local row through `charId` (= the portable uuid): an edit toggle swapping
 * the read-only Ressources block for <NpcInPlayEditor>, and <NpcGearSections>,
 * which shows the armes/armures/boucliers/sorts the wire never carries.
 * Everything else stays readable while you edit.
 */
export function GmSheetBody({
  entry,
  note,
  onSaveNote,
  onDuplicate,
  startEditing = false,
  onDismiss,
  embedded = false,
}: Props & {
  /** Rendered as a side pane rather than a bottom sheet: no drag handle, and
   *  the scroll area claims the pane's height instead of hugging its content. */
  embedded?: boolean;
}) {
  const theme = useProphecyTheme();
  const attrColors = useAttrColors();
  const tendColors = useTendColors();
  // The note draft lives in <GmNotes> so typing re-renders one TextInput instead
  // of the whole sheet (three rings + every skill row). It hands the text back
  // through a ref, read only when Enregistrer is pressed.
  const draftRef = useRef(note);
  // GM's own NPCs only. Callers key this component by charId, so opening
  // another character remounts it and the initial mode is simply the initial
  // state — no effect syncing props into state after the fact.
  const canEdit = entry?.owner === 'gm';
  const [editing, setEditing] = useState(canEdit && startEditing);

  const c = entry?.character;
  // Memoized like its three siblings below, and for the same reason: it feeds
  // the `groups` memo, so a fresh object per render made that memo a no-op and
  // re-grouped every skill on every render.
  const attr = useMemo(() => nums(c?.attributs), [c?.attributs]);
  const skills = useMemo(() => skillsOf(c?.skills), [c?.skills]);
  const effectRows = useMemo(() => effectsOf(c?.effects), [c?.effects]);
  // Wound boxes aren't surfaced as a section, but the malus applies to EVERY
  // roll — initiative, the stat tiles and the skills' TOT column alike, same
  // reading the turn order and the player's own sheet use. Computed before the
  // early return so the grouping memo below can fold it in.
  const wound = useMemo(() => woundOf(c?.wounds), [c?.wounds]);
  // Die marks never cross the wire, so they come from the local rows — filled
  // for the GM's own PNJs, absent for a player's character.
  const dieIconsByUuid = useLocalDieIcons();
  const dieIcons = dieIconsByUuid.get(entry?.charId ?? '') ?? [];
  const groups = useMemo(
    () => groupSkills(skills, attr, attrColors, '', effectRows, wound),
    [skills, attr, attrColors, effectRows, wound],
  );

  if (!entry || !c) return null;
  const carac = nums(c.caracteristiques);
  const tend = nums(c.tendances);
  const resources = pools(c.resources);
  const initiative = (c.initiative ?? {}) as { max?: number; values?: number[] };
  // Global sources (wound + 'all' effects) are read once, above the two grids;
  // a tile badges only the effects aimed at that stat, so an attribut +
  // caractéristique roll doesn't show the same malus twice.
  const global = globalModifier(effectRows, wound);
  const modOf = (key: string) => statModifier(key, effectRows);
  // Rolling reads the character and writes nothing, so it is offered for every
  // roster entry — a player's projection carries the same numbers their own
  // sheet would roll (see lib/campaign-roll), and a GM regularly rolls for an
  // absent player. Editing stays GM-owned; that one does write.
  const rollStat = (key: string, kind: 'attribut' | 'caracteristique') =>
    openRoller(sharedStatRollContext(c, key, kind));
  const rollSkill = (skill: SkillLineData) => openRoller(skillRollContext(skill));

  const save = () => {
    onSaveNote(entry.charId, draftRef.current);
    // Closing IS the confirmation for a bottom sheet. A side pane is meant to
    // stay put, so saving a note there leaves the character open.
    if (!embedded) onDismiss();
  };

  return (
    <>
        {embedded ? null : (
          <View style={[styles.handle, { backgroundColor: theme.colors.outlineVariant }]} />
        )}
        <View style={styles.titleRow}>
          <PlayerAvatar nom={String(c.nom ?? 'Sans nom')} online={entry.online} size={48} />
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              {String(c.nom ?? 'Sans nom')}
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {/* Presence is a player thing: an NPC is held by the GM reading this. */}
              {canEdit ? 'PNJ' : entry.online ? 'En ligne' : 'Hors ligne'}
            </Text>
          </View>
          {/* The sheet's own roller. On a phone it IS a full-screen Modal, so
              the header's dice button is behind it — without this one, an open
              sheet can only roll what it happens to show. */}
          <IconButton
            testID="sheet-dice-roller"
            icon={dsIcon('dice')}
            onPress={() => openRoller()}
            accessibilityLabel="Lancer les dés"
          />
          {canEdit ? (
            <IconButton
              icon={editing ? dsIcon('check') : dsIcon('edit')}
              onPress={() => setEditing((e) => !e)}
              accessibilityLabel={editing ? 'Terminer' : 'Modifier le PNJ'}
            />
          ) : null}
        </View>

        <ScrollView
          style={embedded ? styles.bodyFill : undefined}
          contentContainerStyle={[styles.body, contentWidth]}
          showsVerticalScrollIndicator={false}>
          {/* In play: the editor covers blessures/ressources/conditions/effets,
              so it stands in for the read-only Ressources tile rather than
              doubling it. The reference sections below stay visible. */}
          {editing ? (
            <NpcInPlayEditor charUuid={entry.charId} />
          ) : (
            <Section title="Ressources">
              <ResourceTiles resources={resources} />
            </Section>
          )}

          <GlobalModifierRow modifier={global} />

          <Section title="Tendances">
            <TendanceRings tend={tend} colors={tendColors} />
          </Section>

          {/* Attributs */}
          <Section title="Attributs">
            <View style={styles.grid}>
              {ATTRIBUTS.map((a) => (
                <AttrTile
                  key={a.key}
                  label={a.label}
                  value={attr[a.key] ?? 0}
                  color={attrColors[a.key]}
                  modifier={modOf(a.key)}
                  onRoll={() => rollStat(a.key, 'attribut')}
                />
              ))}
            </View>
          </Section>

          {/* Caractéristiques */}
          <Section title="Caractéristiques">
            <View style={styles.grid}>
              {CARACTERISTIQUES.map((k) => (
                <CaracTile
                  key={k.key}
                  label={k.abbr}
                  rollLabel={k.label}
                  value={carac[k.key] ?? 0}
                  modifier={modOf(k.key)}
                  onRoll={() => rollStat(k.key, 'caracteristique')}
                />
              ))}
            </View>
          </Section>

          {/* Compétences (trained, with specializations) */}
          <Section title="Compétences">
            <SkillGroupsView
              groups={groups}
              emptyLabel="Aucune compétence apprise."
              onRoll={rollSkill}
            />
          </Section>

          {/* Armes/armures/boucliers/sorts: only ever available for a character
              this device owns — a player's is limited to the projection, which
              carries none of it. Renders nothing when there is nothing to show. */}
          {canEdit ? <NpcGearSections charUuid={entry.charId} /> : null}

          {effectRows.length > 0 ? (
            <Section title="Effets actifs">
              <EffectsList effects={effectRows} />
            </Section>
          ) : null}

          <Section title="Initiative">
            <InitiativeChips
              values={initiative.values ?? []}
              max={initiative.max ?? 0}
              wound={wound}
              icons={dieIcons}
            />
          </Section>

          <Section title="Notes privées (MJ)">
            <GmNotes note={note} draftRef={draftRef} />
          </Section>
        </ScrollView>

        <View style={styles.actions}>
          {canEdit && onDuplicate ? (
            <Button
              style={styles.spawn}
              icon="content-duplicate"
              onPress={() => onDuplicate(entry.charId)}>
              Dupliquer
            </Button>
          ) : null}
          <Button onPress={onDismiss}>Fermer</Button>
          <Button mode="contained" icon="content-save" onPress={save}>
            Enregistrer
          </Button>
        </View>
    </>
  );
}

/**
 * Phone presentation: the body in a bottom sheet. On a large screen the
 * Compagnie hosts <GmSheetBody embedded> in a side pane instead, so the roster
 * stays visible while you work on one character.
 */
export default function GmCharacterSheet(props: Props) {
  const theme = useProphecyTheme();
  if (!props.entry) return null;
  return (
    <Portal>
      <Modal
        testID="gm-sheet"
        visible
        onDismiss={props.onDismiss}
        style={styles.wrapper}
        contentContainerStyle={[
          styles.sheet,
          contentWidth,
          { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.border },
        ]}>
        {/* Keyed so switching character resets edit mode and the note draft. */}
        <GmSheetBody key={props.entry.charId} {...props} />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  wrapper: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    maxHeight: '88%',
  },
  // Colour comes from the theme at the call site — nothing here is hardcoded.
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { gap: 18, paddingVertical: 12 },
  // In a pane the sheet has a real height to fill; in the modal it hugs.
  bodyFill: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8 },
  // Pushes Fermer/Enregistrer to the right, keeping the spawn action apart.
  spawn: { marginRight: 'auto' },
});
