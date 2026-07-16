import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Modal, Portal, Text, TextInput } from 'react-native-paper';

import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  RESOURCES,
  TENDANCES,
  WOUND_LEVELS,
} from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';

// The projection arrives as opaque JSON (tolerant reader); read it defensively.
type NumRecord = Record<string, number>;
type PoolRecord = Record<string, { current?: number; max?: number }>;
const nums = (v: unknown): NumRecord => (v ?? {}) as NumRecord;
const pools = (v: unknown): PoolRecord => (v ?? {}) as PoolRecord;

interface Props {
  entry: RosterEntry | null;
  note: string;
  onSaveNote: (charUuid: string, body: string) => void;
  onDismiss: () => void;
}

/**
 * GM-only bottom sheet showing the full shared projection of one roster
 * character (docs/campaign-protocol.md §4 — combat state + core stats) plus the
 * GM's private notes. Read-only for the sheet; the notes are the only editable
 * part and never leave this device.
 */
export default function GmCharacterSheet({ entry, note, onSaveNote, onDismiss }: Props) {
  const theme = useProphecyTheme();
  const [draft, setDraft] = useState(note);
  // Reseed the note when a different character is opened.
  useEffect(() => setDraft(note), [entry?.charId, note]);

  if (!entry) return null;
  const c = entry.character;
  const carac = nums(c.caracteristiques);
  const attr = nums(c.attributs);
  const tend = nums(c.tendances);
  const wounds = pools(c.wounds);
  const resources = pools(c.resources);
  const initiative = (c.initiative ?? {}) as { max?: number; values?: number[] };
  const conditions = String(c.conditions ?? '');

  const save = () => {
    onSaveNote(entry.charId, draft);
    onDismiss();
  };

  const label = { color: theme.colors.onSurfaceVariant };
  const value = { color: theme.colors.onSurface };

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
          <Text variant="headlineSmall" style={value}>
            {String(c.nom ?? 'Sans nom')}
          </Text>
          <Text variant="labelMedium" style={label}>
            {entry.online ? 'En ligne' : 'Hors ligne'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Caractéristiques */}
          <Section title="Caractéristiques" theme={theme}>
            <View style={styles.grid}>
              {CARACTERISTIQUES.map((k) => (
                <Stat key={k.key} label={k.abbr} v={carac[k.key] ?? 0} theme={theme} />
              ))}
            </View>
          </Section>

          {/* Attributs */}
          <Section title="Attributs" theme={theme}>
            <View style={styles.grid}>
              {ATTRIBUTS.map((k) => (
                <Stat key={k.key} label={k.label} v={attr[k.key] ?? 0} theme={theme} />
              ))}
            </View>
          </Section>

          {/* Tendances */}
          <Section title="Tendances" theme={theme}>
            <View style={styles.grid}>
              {TENDANCES.map((t) => (
                <Stat
                  key={t.key}
                  label={t.label}
                  v={tend[t.key] ?? 0}
                  sub={tend[`${t.key}Sub`] ?? 0}
                  theme={theme}
                />
              ))}
            </View>
          </Section>

          {/* Blessures */}
          <Section title="Blessures" theme={theme}>
            {WOUND_LEVELS.map((w) => {
              const pool = wounds[w.key];
              if (!pool?.max) return null;
              return (
                <Row key={w.key} label={w.label} theme={theme}>
                  {`${pool.current ?? 0} / ${pool.max}`}
                </Row>
              );
            })}
          </Section>

          {/* Ressources + initiative */}
          <Section title="Ressources" theme={theme}>
            {RESOURCES.map((r) => {
              const pool = resources[r.key];
              return (
                <Row key={r.key} label={r.label} theme={theme}>
                  {`${pool?.current ?? 0} / ${pool?.max ?? 0}`}
                </Row>
              );
            })}
            <Row label="Initiative" theme={theme}>
              {initiative.values?.length
                ? initiative.values.join(', ')
                : `${initiative.max ?? 0} dé(s)`}
            </Row>
          </Section>

          {conditions ? (
            <Section title="Conditions" theme={theme}>
              <Text variant="bodyMedium" style={value}>
                {conditions}
              </Text>
            </Section>
          ) : null}

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

function Stat({ label, v, sub, theme }: { label: string; v: number; sub?: number; theme: ThemeT }) {
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: theme.prophecy.surfaceContainerLow, borderColor: theme.colors.outlineVariant },
      ]}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
        {v}
        {sub ? <Text variant="bodySmall">{` ·${sub}`}</Text> : null}
      </Text>
    </View>
  );
}

function Row({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ThemeT;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
        {children}
      </Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  body: { gap: 18, paddingVertical: 12 },
  section: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    minWidth: 64,
    flexGrow: 1,
    flexBasis: 64,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8 },
});
