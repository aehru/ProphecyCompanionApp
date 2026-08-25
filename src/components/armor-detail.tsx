import React from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';

import {
  DetailRow,
  PrerequisitesRow,
  gearDetailStyles as styles,
  type CaracValue,
} from '@/components/gear-detail-rows';
import { dsIcon } from '@/components/ui/icon';
import type { Armor } from '@/db/schema';
import { formatDecimal } from '@/lib/character-values';

/**
 * The armor fields the detail prints. Optional throughout so a **catalogue
 * preset** renders through the same view as a saved row — see
 * {@link WeaponDetail} for the full reasoning.
 */
export type ArmorView = Partial<
  Pick<Armor, 'prerequisites' | 'creationDifficulty' | 'creationTime' | 'encombrementMalus' | 'special'>
>;

/**
 * Read-only armor detail rows — extracted out of ArmorCard's expand so the
 * catalogue can preview a preset with its prérequis checked against this
 * character. `onEdit` adds the « Modifier » button; a preview omits it, and a
 * catalogue browsed with no character omits `caracValue` too.
 */
export default function ArmorDetail({
  armor: a,
  caracValue,
  onEdit,
}: {
  armor: ArmorView;
  caracValue?: CaracValue;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.detail}>
      <PrerequisitesRow raw={a.prerequisites} caracValue={caracValue} />

      <DetailRow
        label="Création"
        value={`Diff. ${a.creationDifficulty ?? 0} · Temps ${formatDecimal(a.creationTime ?? 0)}`}
      />

      <DetailRow label="Encombrement" value={String(a.encombrementMalus ?? 0)} />

      {(a.special ?? '').trim() !== '' ? (
        <DetailRow label="Spécial" value={(a.special ?? '').trim()} />
      ) : null}

      {onEdit ? (
        <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
          Modifier
        </Button>
      ) : null}
    </View>
  );
}
