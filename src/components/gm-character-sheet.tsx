import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Modal, Portal, Text, TextInput } from 'react-native-paper';

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
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';

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
  onDismiss: () => void;
}

/**
 * GM-only bottom sheet: the full shared projection of one roster character plus
 * the GM's private notes. Read-only except the notes, which never leave this
 * device. Wounds and conditions are intentionally not surfaced here (design
 * decision); the tactical focus is resources, tendances, stats, trained skills
 * (with specializations), active effects, and initiative.
 */
export default function GmCharacterSheet({ entry, note, onSaveNote, onDismiss }: Props) {
  const theme = useProphecyTheme();
  const attrColors = useAttrColors();
  const tendColors = useTendColors();
  const [draft, setDraft] = useState(note);
  // Reseed the note when a different character is opened.
  useEffect(() => setDraft(note), [entry?.charId, note]);

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

  const save = () => {
    onSaveNote(entry.charId, draft);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible
        onDismiss={onDismiss}
        style={styles.wrapper}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.border },
        ]}>
        <View style={styles.handle} />
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
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Ressources (replaces the design's "Vie" tile) */}
          <Section title="Ressources" theme={theme}>
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
          </Section>

          {/* Tendances — rings (0–10 sub) with the main value below */}
          <Section title="Tendances" theme={theme}>
            <View style={styles.tendRow}>
              {TENDANCES.map((t) => (
                <View key={t.key} style={{ alignItems: 'center', gap: 6 }}>
                  <TendanceRing
                    value={tend[t.key] ?? 0}
                    fill={tend[`${t.key}Sub`] ?? 0}
                    color={tendColors[t.key]}
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

          {/* Effets actifs (bonus/malus) */}
          {effects.length > 0 ? (
            <Section title="Effets actifs" theme={theme}>
              <View style={{ gap: 6 }}>
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
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, minWidth: 64, textAlign: 'right' }}>
                        {e.durationUnit === 'permanent' ? unit : `${e.durationRemaining ?? 0} ${unit}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {/* Initiative */}
          <Section title="Initiative" theme={theme}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {initiative.values?.length
                ? initiative.values.join(', ')
                : `${initiative.max ?? 0} dé(s)`}
            </Text>
          </Section>

          {/* GM private notes */}
          <Section title="Notes privées (MJ)" theme={theme}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              numberOfLines={4}
              placeholder="Jamais envoyées au serveur ni au joueur."
            />
          </Section>
        </ScrollView>

        <View style={styles.actions}>
          <Button onPress={onDismiss}>Fermer</Button>
          <Button mode="contained" icon="content-save" onPress={save}>
            Enregistrer
          </Button>
        </View>
      </Modal>
    </Portal>
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
  effectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8 },
});
