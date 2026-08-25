import React from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';

import {
  DetailRow,
  FormulaRow,
  PrerequisitesRow,
  gearDetailStyles as styles,
  type CaracModifier,
  type CaracValue,
} from '@/components/gear-detail-rows';
import { dsIcon } from '@/components/ui/icon';
import type { Shield } from '@/db/schema';
import { formatDecimal } from '@/lib/character-values';

/**
 * The shield fields the detail prints. Optional throughout so a **catalogue
 * preset** renders through the same view as a saved row — see
 * {@link WeaponDetail} for the full reasoning. `defenseCurrent` is absent from a
 * preset (a fresh shield is undamaged, and `createShield` seeds it from the max),
 * so the catalogue passes the max in its place.
 */
export type ShieldView = Partial<
  Pick<
    Shield,
    | 'damage'
    | 'prerequisites'
    | 'defenseCurrent'
    | 'defenseMax'
    | 'creationDifficulty'
    | 'creationTime'
    | 'encombrementMalus'
    | 'special'
  >
>;

/**
 * Read-only shield detail rows — extracted out of ShieldCard's expand so the
 * catalogue can preview a preset with its damage formula resolved against this
 * character. `onEdit` adds the « Modifier » button; a preview omits it, and a
 * catalogue browsed with no character omits `caracValue` too — the dégâts then
 * stay symbolic.
 */
export default function ShieldDetail({
  shield: s,
  caracValue,
  caracModifier,
  onEdit,
}: {
  shield: ShieldView;
  caracValue?: CaracValue;
  caracModifier?: CaracModifier;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.detail}>
      <FormulaRow
        label="Dégâts"
        raw={s.damage}
        caracValue={caracValue}
        caracModifier={caracModifier}
      />

      <PrerequisitesRow raw={s.prerequisites} caracValue={caracValue} />

      <DetailRow
        label="Défense"
        value={`${s.defenseCurrent ?? s.defenseMax ?? 0}/${s.defenseMax ?? 0}`}
      />

      <DetailRow
        label="Création"
        value={`Diff. ${s.creationDifficulty ?? 0} · Temps ${formatDecimal(s.creationTime ?? 0)}`}
      />

      <DetailRow label="Encombrement" value={String(s.encombrementMalus ?? 0)} />

      {(s.special ?? '').trim() !== '' ? (
        <DetailRow label="Spécial" value={(s.special ?? '').trim()} />
      ) : null}

      {onEdit ? (
        <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
          Modifier
        </Button>
      ) : null}
    </View>
  );
}
