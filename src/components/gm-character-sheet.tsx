import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Modal, Portal, Text, TextInput } from 'react-native-paper';

import {
  AttrTile,
  CaracTile,
  groupSkills,
  PlayerAvatar,
  SkillGroupsView,
  TendanceRing,
  useAttrColors,
  useTendColors,
} from '@/components/campaign/roster-visuals';
import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  EFFECT_TARGET_LABEL,
  EFFECT_UNIT_LABEL,
  RESOURCES,
  TENDANCES,
} from '@/constants/prophecy';
import PnjInPlayEditor from '@/components/campaign/pnj-in-play-editor';
import { dsIcon } from '@/components/ui/icon';
import StatChip from '@/components/ui/stat-chip';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { sharedWoundMalus } from '@/lib/initiative-order';

// The projection arrives as opaque JSON (tolerant reader); read it defensively.
type NumRecord = Record<string, number>;
type PoolRecord = Record<string, { current?: number; max?: number }>;
type SharedEffect = {
  label?: string;
  target?: string;
  value?: number;
  durationUnit?: string;
  durationRemaining?: number;
};
const nums = (v: unknown): NumRecord => (v ?? {}) as NumRecord;
const pools = (v: unknown): PoolRecord => (v ?? {}) as PoolRecord;

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
 * A player's character is read-only — the protocol is one-way and the
 * projection is the privacy boundary. The GM's OWN PNJs (`owner === 'gm'`) get
 * an edit toggle instead, which swaps the read-only Ressources block for
 * <PnjInPlayEditor> — that one reaches past the projection to the local row and
 * edits the in-play values. Everything below it stays readable while you edit.
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
  // GM's own PNJs only. Callers key this component by charId, so opening
  // another character remounts it and the initial mode is simply the initial
  // state — no effect syncing props into state after the fact.
  const canEdit = entry?.owner === 'gm';
  const [editing, setEditing] = useState(canEdit && startEditing);

  const c = entry?.character;
  const attr = nums(c?.attributs);
  const skills = useMemo(
    () => (Array.isArray(c?.skills) ? (c?.skills as Parameters<typeof groupSkills>[0]) : []),
    [c?.skills],
  );
  const effectRows = useMemo(
    () => (Array.isArray(c?.effects) ? (c?.effects as Parameters<typeof groupSkills>[4]) : []),
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
  const effects = Array.isArray(c.effects) ? (c.effects as SharedEffect[]) : [];
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
              {entry.online ? 'En ligne' : 'Hors ligne'}
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
            <PnjInPlayEditor charUuid={entry.charId} />
          ) : (
            <Section title="Ressources" theme={theme}>
              <ResourceTiles resources={resources} />
            </Section>
          )}

          <Section title="Tendances" theme={theme}>
            <TendanceRings tend={tend} colors={tendColors} />
          </Section>

          {/* Attributs */}
          <Section title="Attributs" theme={theme}>
            <View style={styles.grid}>
              {ATTRIBUTS.map((a) => (
                <AttrTile key={a.key} label={a.label} value={attr[a.key] ?? 0} color={attrColors[a.key]} />
              ))}
            </View>
          </Section>

          {/* Caractéristiques */}
          <Section title="Caractéristiques" theme={theme}>
            <View style={styles.grid}>
              {CARACTERISTIQUES.map((k) => (
                <CaracTile key={k.key} label={k.abbr} value={carac[k.key] ?? 0} />
              ))}
            </View>
          </Section>

          {/* Compétences (trained, with specializations) */}
          <Section title="Compétences" theme={theme}>
            <SkillGroupsView groups={groups} emptyLabel="Aucune compétence apprise." />
          </Section>

          {effects.length > 0 ? (
            <Section title="Effets actifs" theme={theme}>
              <EffectsList effects={effects} />
            </Section>
          ) : null}

          <Section title="Initiative" theme={theme}>
            <InitiativeChips values={initiative.values ?? []} max={initiative.max ?? 0} wound={wound} />
          </Section>

          <Section title="Notes privées (MJ)" theme={theme}>
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

/** Maîtrise / Chance pools, read-only (the editor covers them when editing). */
function ResourceTiles({ resources }: { resources: PoolRecord }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.grid}>
      {RESOURCES.map((r) => {
        const pool = resources[r.key];
        return (
          <View
            key={r.key}
            style={[
              styles.poolTile,
              { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.prophecy.borderSoft },
            ]}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {r.label}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              {pool?.current ?? 0} / {pool?.max ?? 0}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** The three tendance rings: 0–10 sub-level filled, main value under it. */
function TendanceRings({
  tend,
  colors,
}: {
  tend: NumRecord;
  colors: Record<string, string>;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.tendRow}>
      {TENDANCES.map((t) => (
        <View key={t.key} style={styles.tendCell}>
          <TendanceRing
            value={tend[t.key] ?? 0}
            fill={tend[`${t.key}Sub`] ?? 0}
            color={colors[t.key]}
            size={82}
          />
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.onSurface }}>
            {t.label}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {tend[`${t.key}Sub`] ?? 0}/10
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Active bonus/malus, with the remaining duration in its own unit. */
function EffectsList({ effects }: { effects: SharedEffect[] }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.effectList}>
      {effects.map((e, i) => {
        const v = e.value ?? 0;
        const target = EFFECT_TARGET_LABEL[e.target ?? 'all'] ?? e.target ?? 'Tous les jets';
        const unit = EFFECT_UNIT_LABEL[e.durationUnit ?? 'round'] ?? e.durationUnit ?? '';
        return (
          <View key={`${e.label}-${i}`} style={styles.effectRow}>
            <Text style={{ flex: 1, color: theme.colors.onSurface }} numberOfLines={1}>
              {e.label || 'Effet'} · {target}
            </Text>
            <Text
              style={{
                fontFamily: 'Cinzel_600SemiBold',
                color: v < 0 ? theme.colors.error : theme.colors.primary,
              }}>
              {v > 0 ? `+${v}` : v}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.effectDuration, { color: theme.colors.onSurfaceVariant }]}>
              {e.durationUnit === 'permanent' ? unit : `${e.durationRemaining ?? 0} ${unit}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Rolled dice, read like the player's own sheet: wound malus badged on each,
 * error border once a die is driven to 0 or below (the action is lost).
 */
function InitiativeChips({
  values,
  max,
  wound,
}: {
  values: number[];
  max: number;
  wound: number;
}) {
  const theme = useProphecyTheme();
  if (values.length === 0) {
    return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
        {`${max} dé(s)`}
      </Text>
    );
  }
  return (
    <View style={styles.grid}>
      {values.map((val, i) => (
        <StatChip
          key={i}
          label={`Dé ${i + 1}`}
          value={String(val)}
          modifier={wound}
          style={
            val > 0 && val + wound <= 0
              ? { borderColor: theme.colors.error, borderWidth: 1.5 }
              : undefined
          }
        />
      ))}
    </View>
  );
}

/**
 * The GM's private note field. Owns the draft so keystrokes stay local; the
 * parent reads the latest text off `draftRef` when saving. Never leaves the
 * device — it isn't part of the shared projection.
 */
function GmNotes({
  note,
  draftRef,
}: {
  note: string;
  draftRef: React.MutableRefObject<string>;
}) {
  const [draft, setDraft] = useState(note);
  draftRef.current = draft;
  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      multiline
      numberOfLines={4}
      placeholder="Jamais envoyées au serveur ni au joueur."
    />
  );
}

type ThemeT = ReturnType<typeof useProphecyTheme>;

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: ThemeT;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
        {title}
      </Text>
      <Divider style={{ backgroundColor: theme.prophecy.border }} />
      {children}
    </View>
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
  section: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  poolTile: {
    flexGrow: 1,
    flexBasis: 100,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tendRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 6 },
  tendCell: { alignItems: 'center', gap: 6 },
  effectList: { gap: 6 },
  effectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  effectDuration: { minWidth: 64, textAlign: 'right' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8 },
  // Pushes Fermer/Enregistrer to the right, keeping the spawn action apart.
  spawn: { marginRight: 'auto' },
});
