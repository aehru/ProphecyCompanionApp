import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

import EffectDialog from '@/components/effect-dialog';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { PERMANENT_UNIT, TIME_UNIT_LABEL, TIME_UNITS } from '@/constants/prophecy';
import type { Effect, Skill } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { effectTargetLabel, fmtSignedMod, isSkillTarget, skillTargetName } from '@/lib/modifiers';
import { tickUnit } from '@/repositories/effects';

/** An effect targets a skill that the character no longer owns (renamed/deleted). */
function isOrphanSkill(target: string, skills: Skill[]): boolean {
  return isSkillTarget(target) && !skills.some((s) => s.name === skillTargetName(target));
}

/**
 * Temporary bonuses/maluses. Each row is a summary; tapping one opens
 * <EffectDialog> over the card, and « Ajouter un effet » at the top opens the
 * same dialog empty. The tab edit toggle only exposes the per-unit "time passes"
 * controls (tick a unit's effects −1); it does NOT add delete/edit controls,
 * since both live in the dialog.
 *
 * Creating and editing stay INSIDE the card because it is reused by the GM's NPC
 * editor: an add FAB only existed on the Fiche, and the editor used to be a
 * character-scoped route, so a GM adjusting an NPC's malus was thrown out of the
 * campaign screen to do it.
 *
 * `permanent` effects never tick or expire; effects targeting a skill by name
 * that no longer exists are flagged as orphaned (they simply stop applying).
 */
export default function EffectsCard({
  characterId,
  effects,
  skills,
  editing,
}: {
  characterId: number;
  effects: Effect[];
  // Character's owned skills — used to flag orphaned skill targets, and offered
  // as targets in the dialog.
  skills: Skill[];
  editing: boolean;
}) {
  const theme = useProphecyTheme();
  // null = closed. 'new' = create; an Effect = edit that row. The dialog is
  // KEYED on this so each open mounts a fresh draft rather than reusing the
  // previous row's fields.
  const [open, setOpen] = useState<Effect | 'new' | null>(null);

  // Units that still have at least one active effect — the only ones worth
  // offering a "time passes" button for. PERMANENT_UNIT is not in TIME_UNITS,
  // so permanent effects never appear here.
  const liveUnits = TIME_UNITS.filter((u) =>
    effects.some((e) => !e.expired && e.durationUnit === u.key),
  );

  return (
    <SectionCard title="EFFETS" icon="fire">
      <Button mode="outlined" icon={dsIcon('plus')} onPress={() => setOpen('new')}>
        Ajouter un effet
      </Button>

      {effects.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Aucun effet.</Text>
      ) : (
        effects.map((e) => (
          <EffectRow
            key={e.id}
            effect={e}
            orphan={isOrphanSkill(e.target, skills)}
            onPress={() => setOpen(e)}
          />
        ))
      )}

      {editing && liveUnits.length > 0 ? (
        <View style={styles.timeBlock}>
          <Text style={[styles.timeLabel, { color: theme.colors.onSurfaceVariant }]}>
            Temps écoulé :
          </Text>
          <View style={styles.timeRow}>
            {liveUnits.map((u) => (
              <Button
                key={u.key}
                mode="outlined"
                compact
                icon="clock-minus-outline"
                onPress={() => tickUnit(characterId, u.key)}>
                {u.label} −1
              </Button>
            ))}
          </View>
        </View>
      ) : null}

      {open ? (
        <EffectDialog
          key={open === 'new' ? 'new' : open.id}
          visible
          effect={open === 'new' ? null : open}
          characterId={characterId}
          skills={skills}
          onDismiss={() => setOpen(null)}
        />
      ) : null}
    </SectionCard>
  );
}

function EffectRow({
  effect: e,
  orphan,
  onPress,
}: {
  effect: Effect;
  orphan: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();

  const targetLabel = effectTargetLabel(e.target);
  const isPermanent = e.durationUnit === PERMANENT_UNIT;
  const unitLabel = TIME_UNIT_LABEL[e.durationUnit] ?? e.durationUnit;
  const valueColor = e.value > 0 ? theme.colors.primary : theme.colors.error;

  // Duration/state phrase after the target label.
  const stateText = e.expired
    ? ' · expiré'
    : isPermanent
      ? ' · Permanent'
      : ` · ${e.durationRemaining} ${unitLabel}`;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, e.expired && styles.expiredText]}>
          {e.label.trim() || targetLabel}
        </Text>
        <Text style={[styles.rowSub, { color: theme.colors.onSurfaceVariant }]}>
          {targetLabel}
          {stateText}
          {orphan ? ' · compétence supprimée' : ''}
        </Text>
      </View>
      {e.value !== 0 ? (
        <Text
          style={[
            styles.rowValue,
            { color: e.expired || orphan ? theme.colors.onSurfaceVariant : valueColor },
          ]}>
          {fmtSignedMod(e.value)}
        </Text>
      ) : null}
      <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 12 },
  expiredText: { textDecorationLine: 'line-through' },
  timeBlock: { gap: 6, marginTop: 4 },
  timeLabel: { fontSize: 12 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowValue: { fontSize: 18, fontWeight: '700', minWidth: 36, textAlign: 'right' },
});
