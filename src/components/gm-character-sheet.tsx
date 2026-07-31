import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Modal, Portal, Text } from 'react-native-paper';

import NpcGearSections from '@/components/campaign/npc-gear-sections';
import NpcInPlayEditor from '@/components/campaign/npc-in-play-editor';
import { useAttrColors, useTendColors } from '@/components/campaign/roster-accents';
import { PlayerAvatar } from '@/components/campaign/roster-badges';
import SkillGroupsView from '@/components/campaign/skill-groups-view';
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
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { sharedWoundMalus } from '@/lib/initiative-order';
import { groupSkills, type SharedSkill } from '@/lib/skill-groups';
import { nums, pools, type SharedEffectView } from '@/lib/shared-character-view';

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
  const attr = nums(c?.attributs);
  const skills = useMemo(
    () => (Array.isArray(c?.skills) ? (c?.skills as SharedSkill[]) : []),
    [c?.skills],
  );
  const effectRows = useMemo(
    () => (Array.isArray(c?.effects) ? (c?.effects as SharedEffectView[]) : []),
    [c?.effects],
  );
  const groups = useMemo(
    () => groupSkills(skills, attr, attrColors, '', effectRows),
    [skills, attr, attrColors, effectRows],
  );

  if (!entry || !c) return null;
  const carac = nums(c.caracteristiques);
  const tend = nums(c.tendances);
  const resources = pools(c.resources);
  const initiative = (c.initiative ?? {}) as { max?: number; values?: number[] };
  const effects = Array.isArray(c.effects) ? (c.effects as SharedEffectView[]) : [];
  // Wound boxes aren't surfaced as a section, but the wound malus still applies
  // to initiative — same reading the turn order uses.
  const wound = sharedWoundMalus(pools(c.wounds));

  const save = () => {
    onSaveNote(entry.charId, draftRef.current);
    // Closing IS the confirmation for a bottom sheet. A side pane is meant to
    // stay put, so saving a note there leaves the character open.
    if (!embedded) onDismiss();
  };

  return (
    <>
        {embedded ? null : <View style={styles.handle} />}
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

          <Section title="Tendances">
            <TendanceRings tend={tend} colors={tendColors} />
          </Section>

          {/* Attributs */}
          <Section title="Attributs">
            <View style={styles.grid}>
              {ATTRIBUTS.map((a) => (
                <AttrTile key={a.key} label={a.label} value={attr[a.key] ?? 0} color={attrColors[a.key]} />
              ))}
            </View>
          </Section>

          {/* Caractéristiques */}
          <Section title="Caractéristiques">
            <View style={styles.grid}>
              {CARACTERISTIQUES.map((k) => (
                <CaracTile key={k.key} label={k.abbr} value={carac[k.key] ?? 0} />
              ))}
            </View>
          </Section>

          {/* Compétences (trained, with specializations) */}
          <Section title="Compétences">
            <SkillGroupsView groups={groups} emptyLabel="Aucune compétence apprise." />
          </Section>

          {/* Armes/armures/boucliers/sorts: only ever available for a character
              this device owns — a player's is limited to the projection, which
              carries none of it. Renders nothing when there is nothing to show. */}
          {canEdit ? <NpcGearSections charUuid={entry.charId} /> : null}

          {effects.length > 0 ? (
            <Section title="Effets actifs">
              <EffectsList effects={effects} />
            </Section>
          ) : null}

          <Section title="Initiative">
            <InitiativeChips values={initiative.values ?? []} max={initiative.max ?? 0} wound={wound} />
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
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8888',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { gap: 18, paddingVertical: 12 },
  // In a pane the sheet has a real height to fill; in the modal it hugs.
  bodyFill: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8 },
  // Pushes Fermer/Enregistrer to the right, keeping the spawn action apart.
  spawn: { marginRight: 'auto' },
});
