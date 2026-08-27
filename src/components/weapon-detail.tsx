import React from 'react';
import { View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import {
  DetailRow,
  FormulaRow,
  PrerequisitesRow,
  gearDetailStyles as styles,
  type CaracModifier,
  type CaracValue,
} from '@/components/gear-detail-rows';
import { dsIcon } from '@/components/ui/icon';
import type { Weapon } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formatDecimal } from '@/lib/character-values';
import { fmtSignedMod } from '@/lib/modifiers';
import type { WeaponSkillReading } from '@/lib/weapon-skill';

/**
 * The weapon fields the detail prints. Every one is optional because the same
 * view renders a **catalogue preset** (`WeaponPreset['data']`, whose columns are
 * insert-optional) as well as a saved row — see {@link WeaponDetail}.
 */
export type WeaponView = Partial<
  Pick<
    Weapon,
    | 'damage'
    | 'prerequisites'
    | 'rangeEffective'
    | 'rangeMax'
    | 'initMelee'
    | 'initCorpsACorps'
    | 'creationDifficulty'
    | 'creationTime'
    | 'special'
  >
>;

/**
 * The equip controls, which need the saved row's identity (and its handedness).
 * Omitted by the catalogue preview: there is nothing to equip yet.
 */
export type WeaponEquip = {
  hands: number;
  equippedHand: Weapon['equippedHand'];
  onToggle: (hand: 'main' | 'off' | 'both') => void;
};

/**
 * Read-only weapon detail rows — extracted out of WeaponCard's expand so the
 * catalogue can preview a preset with the exact same reading (formulas resolved
 * against this character, prérequis checked, compétence total), mirroring what
 * {@link SpellDetail} already does for spells.
 *
 * `onEdit` adds the « Modifier » button and `equip` the hand buttons; a preview
 * passes neither. A catalogue browsed with no character in context passes no
 * `caracValue` or `skill` either: the dégâts and portées stay symbolic and the
 * compétence line is skipped, since both are readings of a sheet that is not
 * there.
 */
export default function WeaponDetail({
  weapon: w,
  caracValue,
  caracModifier,
  skill,
  equip,
  onEdit,
}: {
  weapon: WeaponView;
  caracValue?: CaracValue;
  caracModifier?: CaracModifier;
  skill?: WeaponSkillReading;
  equip?: WeaponEquip;
  onEdit?: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.detail}>
      {skill ? <SkillRow skill={skill} /> : null}

      <FormulaRow
        label="Dégâts"
        raw={w.damage}
        caracValue={caracValue}
        caracModifier={caracModifier}
      />

      <PrerequisitesRow raw={w.prerequisites} caracValue={caracValue} />

      <FormulaRow label="Portée eff." raw={w.rangeEffective} caracValue={caracValue} />
      <FormulaRow label="Portée max" raw={w.rangeMax} caracValue={caracValue} />

      <DetailRow
        label="Initiative"
        value={`Mêlée ${fmtSigned(w.initMelee ?? 0)} · CàC ${fmtSigned(w.initCorpsACorps ?? 0)}`}
      />

      <DetailRow
        label="Création"
        value={`Diff. ${w.creationDifficulty ?? 0} · Temps ${formatDecimal(w.creationTime ?? 0)}`}
      />

      {(w.special ?? '').trim() !== '' ? (
        <DetailRow label="Spécial" value={(w.special ?? '').trim()} />
      ) : null}

      {equip ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Équiper</Text>
          <View style={styles.equipBtns}>
            <Button
              compact
              mode={equip.equippedHand === 'main' ? 'contained-tonal' : 'outlined'}
              onPress={() => equip.onToggle('main')}>
              Main
            </Button>
            <Button
              compact
              mode={equip.equippedHand === 'off' ? 'contained-tonal' : 'outlined'}
              onPress={() => equip.onToggle('off')}>
              Main sec.
            </Button>
            {/* Two-handed only: a 1H weapon is never wielded in both hands. */}
            {equip.hands === 2 ? (
              <Button
                compact
                mode={equip.equippedHand === 'both' ? 'contained-tonal' : 'outlined'}
                onPress={() => equip.onToggle('both')}>
                Deux mains
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}

      {onEdit ? (
        <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
          Modifier
        </Button>
      ) : null}
    </View>
  );
}

/**
 * The compétence line: which skill this weapon is wielded with, and the total
 * the player rolls on. Three readings, three tones — an unset link is a normal
 * state (nothing to alarm about), a dangling one is an error, and a skill with
 * no points still shows its total, tagged « non acquise » so the player knows
 * they are rolling on the attribut alone.
 *
 * A reading, not a control: the roll lives on the collapsed row's badge, and
 * offering it twice on one card would only ask the player which one to press.
 */
function SkillRow({ skill }: { skill: WeaponSkillReading }) {
  const theme = useProphecyTheme();

  if (skill.status === 'unset') {
    return (
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Compétence</Text>
        <Text style={[styles.value, { color: theme.colors.onSurfaceVariant }]}>
          Non définie — à choisir dans « Modifier »
        </Text>
      </View>
    );
  }

  if (skill.status === 'unknown') {
    return (
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Compétence</Text>
        <Text style={[styles.value, { color: theme.colors.error }]}>
          « {skill.name} » introuvable
        </Text>
      </View>
    );
  }

  const modColor = skill.bonus > 0 ? theme.colors.primary : theme.colors.error;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Compétence</Text>
      <View style={styles.formulaCol}>
        <View style={styles.skillNameRow}>
          <Text style={styles.skillName}>{skill.name}</Text>
          {!skill.trained ? (
            <Text style={[styles.untrained, { color: theme.colors.onSurfaceVariant }]}>
              non acquise
            </Text>
          ) : null}
        </View>
        <View style={styles.resultRow}>
          <Text style={[styles.result, { color: theme.colors.primary }]}>= {skill.total}</Text>
          <Text style={[styles.breakdown, { color: theme.colors.onSurfaceVariant }]}>
            ({skill.attributLabel} {skill.attributValue} + {skill.value})
          </Text>
          {skill.bonus !== 0 ? (
            <>
              <IconButton icon="alert-circle" size={14} iconColor={modColor} style={styles.modIcon} />
              <Text style={[styles.modNote, { color: modColor }]}>({fmtSignedMod(skill.bonus)})</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function fmtSigned(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

