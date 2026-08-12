import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import EditableSection from '@/components/ui/editable-section';
import { dsIcon } from '@/components/ui/icon';
import StatChip from '@/components/ui/stat-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { initiativeDiceCount } from '@/lib/dice';

/**
 * INITIATIVE: one slot per die rolled this turn, plus the temporary-dice
 * stepper. Owns its own read/edit toggle (an `EditableSection`), so it drops
 * into the Fiche and into the GM's PNJ editor unchanged.
 *
 * `max` is the sheet's `initiativeMax`, `bonus` the in-play signed
 * `initiativeBonusDice` — the grid is sized from the two together. The bonus is
 * deliberately manual and never auto-clears: the app doesn't know when the
 * two-weapon flurry or the spell ends. Any malus that accompanies extra dice is
 * a normal `effects` row, not part of this count.
 */
export default function InitiativeSection({
  max,
  bonus,
  values,
  wound,
  onSetDie,
  onSetBonus,
  onRoll,
}: {
  max: number;
  bonus: number;
  values: number[];
  /** Wound malus, applied to every die (non-positive). */
  wound: number;
  onSetDie: (index: number, value: number) => void;
  onSetBonus: (value: number) => void;
  onRoll: () => void;
}) {
  const theme = useProphecyTheme();
  const count = initiativeDiceCount(max, bonus);
  const plural = Math.abs(bonus) > 1 ? 's' : '';
  // Extra dice are appended after the sheet's own, so anything past `max` is a
  // temporary one. Only meaningful for a POSITIVE bonus: a negative one removes
  // dice, it never marks one — hence the out-of-range floor.
  const firstTemporary = bonus > 0 ? max : count;

  return (
    <EditableSection
      title="INITIATIVE"
      action={() =>
        count > 0 ? (
          <IconButton
            icon={dsIcon('dice')}
            size={18}
            onPress={onRoll}
            accessibilityLabel="Lancer l’initiative"
            style={styles.roll}
          />
        ) : null
      }>
      {(editing) => (
        <>
          {editing ? (
            <View style={styles.bonusRow}>
              <Text style={styles.bonusLabel}>Dés supplémentaires</Text>
              <IconButton
                icon="minus"
                mode="contained"
                size={16}
                // Floor the stepper where the grid floors: once the character is
                // down to no die at all, further -1 taps would do nothing visible.
                disabled={count <= 0}
                onPress={() => onSetBonus(bonus - 1)}
              />
              <Text style={styles.bonusCount}>{bonus > 0 ? `+${bonus}` : bonus}</Text>
              <IconButton
                icon={dsIcon('plus')}
                mode="contained"
                size={16}
                onPress={() => onSetBonus(bonus + 1)}
              />
              <IconButton
                icon="refresh"
                size={16}
                disabled={bonus === 0}
                onPress={() => onSetBonus(0)}
                accessibilityLabel="Retirer les dés supplémentaires"
              />
            </View>
          ) : bonus !== 0 ? (
            // Read view stays clean when there's nothing temporary going on, but
            // a lingering bonus stays stated — nothing clears it but the player,
            // so a forgotten die would otherwise quietly ride along all session.
            // The ✦ on the slots below says WHICH die; this line says how many.
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {bonus > 0
                ? `✦ +${bonus} dé${plural} supplémentaire${plural}`
                : `${-bonus} dé${plural} en moins`}
            </Text>
          ) : null}

          {count <= 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Définis l’initiative (max) avec le crayon en haut.
            </Text>
          ) : (
            <View style={styles.grid}>
              {Array.from({ length: count }, (_, i) => values[i] ?? 0).map((val, i) => {
                // A ✦ on the label is the whole marking: no border, no fill. The
                // slot says which die is temporary without the grid shouting.
                const label = i >= firstTemporary ? `Dé ${i + 1} ✦` : `Dé ${i + 1}`;
                if (editing) {
                  return (
                    <NumberField
                      key={i}
                      fieldKey={String(i)}
                      label={label}
                      value={String(val)}
                      onChange={(k, t) => onSetDie(Number(k), parseInt(t, 10) || 0)}
                      style={styles.field}
                    />
                  );
                }
                // Wound malus applies to initiative like any roll. A rolled die
                // driven to 0 or below is unusable → error border.
                const unusable = val > 0 && val + wound <= 0;
                return (
                  <StatChip
                    key={i}
                    label={label}
                    value={String(val)}
                    modifier={wound}
                    style={
                      unusable ? { borderColor: theme.colors.error, borderWidth: 1.5 } : undefined
                    }
                  />
                );
              })}
            </View>
          )}
        </>
      )}
    </EditableSection>
  );
}

const styles = StyleSheet.create({
  roll: { margin: 0 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bonusLabel: { flex: 1, fontSize: 16 },
  bonusCount: { minWidth: 32, textAlign: 'center', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 0, flexBasis: 72, minWidth: 72 },
});
