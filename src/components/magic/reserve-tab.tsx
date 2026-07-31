// Réserve tab: what the character can spend. Disciplines are read-only stats
// (edited in the sheet form); the global reserve and each known sphere are pools
// tapped bullet by bullet; reserve OBJECTS are independent pools of their own
// (magic_reserves rows), only listed once one exists or while editing.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import Bullets from '@/components/bullets';
import Columns from '@/components/ui/columns';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { DISCIPLINES, SPHERES } from '@/constants/prophecy';
import type { MagicReserve } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { num } from '@/lib/character-values';

export default function ReserveTab({
  rec,
  stRec,
  editing,
  objects,
  onSetCurrent,
  onSetObjectCurrent,
  onEditObject,
  onAddObject,
  onDeleteObject,
}: {
  /** Numeric view of the character row (maximums). */
  rec: Record<string, number>;
  /** Numeric view of actual_state (current values). */
  stRec: Record<string, number>;
  editing: boolean;
  objects: MagicReserve[];
  onSetCurrent: (key: string, value: number) => void;
  onSetObjectCurrent: (object: MagicReserve, value: number) => void;
  onEditObject: (object: MagicReserve) => void;
  onAddObject: () => void;
  onDeleteObject: (object: MagicReserve) => void;
}) {
  const theme = useProphecyTheme();
  const dotColor = editing ? theme.colors.primary : theme.colors.onSurfaceVariant;
  const knownSpheres = SPHERES.filter((s) => (rec[`${s.key}Max`] ?? 0) > 0);

  return (
    <Columns>
      <SectionCard title="DISCIPLINES" icon="book">
        <View style={styles.grid}>
          {DISCIPLINES.map((d) => (
            <StatChip key={d.key} label={d.label} value={num(rec[d.key])} />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="RÉSERVE" icon="magic">
        <View style={styles.sphereRow}>
          <Text style={styles.sphereLabel}>Globale</Text>
          <Bullets
            count={rec.reserveMagiqueMax ?? 0}
            filled={stRec.reserveMagiqueCurrent ?? 0}
            perRow={5}
            color={dotColor}
            size={18}
            gap={6}
            onSet={editing ? (n) => onSetCurrent('reserveMagiqueCurrent', n) : undefined}
          />
        </View>

        {knownSpheres.map((s) => {
          const curKey = `${s.key}Current`;
          return (
            <View
              key={s.key}
              style={[
                styles.sphereRow,
                styles.sphereDivider,
                { borderTopColor: theme.colors.outlineVariant },
              ]}>
              <Text style={styles.sphereLabel}>{s.label}</Text>
              <Bullets
                count={rec[`${s.key}Max`] ?? 0}
                filled={stRec[curKey] ?? 0}
                perRow={5}
                color={dotColor}
                size={18}
                gap={6}
                onSet={editing ? (n) => onSetCurrent(curKey, n) : undefined}
              />
            </View>
          );
        })}
      </SectionCard>

      {/* Gear, not everyone's business: the section only exists once the
          character owns an object — or while editing, to add the first one. */}
      {objects.length === 0 && !editing ? null : (
        <SectionCard title="OBJETS DE RÉSERVE" icon="magic">
          {objects.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Aucun objet. Ajoutez-en un ci-dessous.
            </Text>
          ) : (
            objects.map((o) => (
              <ReserveObjectRow
                key={o.id}
                object={o}
                editing={editing}
                dotColor={dotColor}
                onEdit={() => onEditObject(o)}
                onSetCurrent={(n) => onSetObjectCurrent(o, n)}
                onDelete={() => onDeleteObject(o)}
              />
            ))
          )}

          {editing ? (
            <Button mode="outlined" icon={dsIcon('plus')} onPress={onAddObject}>
              Ajouter un objet
            </Button>
          ) : null}
        </SectionCard>
      )}
    </Columns>
  );
}

/** One reserve object: its own pool, renamable and deletable while editing. */
function ReserveObjectRow({
  object: o,
  editing,
  dotColor,
  onEdit,
  onSetCurrent,
  onDelete,
}: {
  object: MagicReserve;
  editing: boolean;
  dotColor: string;
  onEdit: () => void;
  onSetCurrent: (value: number) => void;
  onDelete: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[styles.sphereRow, styles.objectRow, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Pressable style={styles.objectLabel} disabled={!editing} onPress={onEdit}>
        <Text style={styles.sphereLabel}>{o.nom.trim() || 'Objet'}</Text>
        {editing ? (
          <Text style={[styles.objectHint, { color: theme.colors.onSurfaceVariant }]}>Modifier</Text>
        ) : null}
      </Pressable>
      <Bullets
        count={o.max}
        filled={o.current}
        perRow={5}
        color={dotColor}
        size={18}
        gap={6}
        style={styles.objectBullets}
        onSet={editing ? onSetCurrent : undefined}
      />
      {editing ? (
        <IconButton icon="delete" size={18} iconColor={theme.colors.error} onPress={onDelete} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  sphereRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sphereDivider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  sphereLabel: { width: 72, fontSize: 15, lineHeight: 16 },
  // Reserve objects: name column keeps the sphere alignment, bullets take the
  // rest so the delete button stays pinned right. Bottom hairline like the DS
  // inventory rows (spell/weapon/armor cards), not the sphere top divider.
  objectRow: { alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
  objectLabel: { width: 72 },
  objectHint: { fontSize: 11 },
  objectBullets: { flex: 1 },
});
