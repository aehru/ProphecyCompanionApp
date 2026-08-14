import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import DsDialog from '@/components/ui/ds-dialog';
import EditableSection from '@/components/ui/editable-section';
import { dsIcon, type IconName } from '@/components/ui/icon';
import StatChip from '@/components/ui/stat-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { initiativeDiceCount } from '@/lib/dice';

/**
 * The glyphs a die can be marked with. Drawn from the DS set (no emoji: they
 * ignore the theme and render differently per platform), and deliberately a
 * SHORT list — it is a memo for the next two minutes of a fight, not a
 * taxonomy. The app attaches no rule to a mark; « la dague » is whatever the
 * player decided « la dague » is.
 */
const DIE_ICONS: readonly IconName[] = [
  'sword',
  'shield',
  'magic',
  'fire',
  'potion',
  'rune',
  'star',
  'moon',
];

/** A stored icon key is only rendered if it is still one we know. */
function asDieIcon(key: string | undefined): IconName | undefined {
  return key && (DIE_ICONS as readonly string[]).includes(key) ? (key as IconName) : undefined;
}

/**
 * INITIATIVE: one slot per die rolled this turn, the extra-dice stepper, and a
 * per-die mark. Owns its own read/edit toggle (an `EditableSection`), so it
 * drops into the Fiche and into the GM's PNJ editor unchanged.
 *
 * `max` is the sheet's `initiativeMax`, `bonus` the in-play signed
 * `initiativeBonusDice` — the grid is sized from the two together. The bonus is
 * deliberately manual and never auto-clears: the app doesn't know when the
 * two-weapon flurry or the spell ends. Any malus that accompanies extra dice is
 * a normal `effects` row, not part of this count.
 *
 * `icons` is index-aligned with `values`. A die's identity lives on its ICON,
 * never on its index: the roll sorts value+icon pairs together, so slot 2 is not
 * "the off-hand die" — the 🗡 is. Nothing here may key off position.
 */
export default function InitiativeSection({
  max,
  bonus,
  values,
  icons,
  wound,
  onSetDie,
  onSetIcon,
  onSetBonus,
  onRoll,
}: {
  max: number;
  bonus: number;
  values: number[];
  icons: string[];
  /** Wound malus, applied to every die (non-positive). */
  wound: number;
  onSetDie: (index: number, value: number) => void;
  onSetIcon: (index: number, icon: string) => void;
  onSetBonus: (value: number) => void;
  onRoll: () => void;
}) {
  const theme = useProphecyTheme();
  const count = initiativeDiceCount(max, bonus);
  const plural = Math.abs(bonus) > 1 ? 's' : '';
  // Which slot's picker is open; null = closed. Index rather than a boolean so
  // the dialog knows what it is editing.
  const [picking, setPicking] = useState<number | null>(null);

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
            // Read view stays clean when there's nothing extra going on, but a
            // lingering bonus stays stated — nothing clears it but the player, so
            // a forgotten die would otherwise quietly ride along all session.
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {bonus > 0
                ? `+${bonus} dé${plural} supplémentaire${plural}`
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
                const icon = asDieIcon(icons[i]);
                if (editing) {
                  return (
                    <View key={i} style={styles.slot}>
                      <NumberField
                        fieldKey={String(i)}
                        label={`Dé ${i + 1}`}
                        value={String(val)}
                        onChange={(k, t) => onSetDie(Number(k), parseInt(t, 10) || 0)}
                      />
                      <IconButton
                        // No mark yet reads as a faint plus, so an empty slot
                        // still says "you can mark me".
                        icon={dsIcon(icon ?? 'plus')}
                        size={16}
                        iconColor={icon ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        style={styles.slotMark}
                        onPress={() => setPicking(i)}
                        accessibilityLabel={`Marquer le dé ${i + 1}`}
                      />
                    </View>
                  );
                }
                // Wound malus applies to initiative like any roll. A rolled die
                // driven to 0 or below is unusable → error border.
                const unusable = val > 0 && val + wound <= 0;
                return (
                  <StatChip
                    key={i}
                    label={`Dé ${i + 1}`}
                    value={String(val)}
                    modifier={wound}
                    icon={icon}
                    style={
                      unusable ? { borderColor: theme.colors.error, borderWidth: 1.5 } : undefined
                    }
                  />
                );
              })}
            </View>
          )}

          <DieIconDialog
            visible={picking != null}
            current={picking != null ? asDieIcon(icons[picking]) : undefined}
            onDismiss={() => setPicking(null)}
            onPick={(key) => {
              if (picking != null) onSetIcon(picking, key);
              setPicking(null);
            }}
          />
        </>
      )}
    </EditableSection>
  );
}

/**
 * The glyph picker. Tapping a glyph applies it and closes — a mid-fight action
 * shouldn't need a confirm. « Aucun » is the way back to an unmarked die, which
 * is why it sits in the actions rather than as a ninth glyph.
 */
function DieIconDialog({
  visible,
  current,
  onDismiss,
  onPick,
}: {
  visible: boolean;
  current?: IconName;
  onDismiss: () => void;
  onPick: (icon: string) => void;
}) {
  const theme = useProphecyTheme();
  return (
    <DsDialog
      visible={visible}
      onDismiss={onDismiss}
      title="Marquer le dé"
      actions={
        <>
          <Button onPress={onDismiss}>Annuler</Button>
          <Button mode="contained" icon={dsIcon('close')} onPress={() => onPick('')}>
            Aucun
          </Button>
        </>
      }>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        À quoi sert ce dé ? Le repère est un simple mémo : l’app n’y attache
        aucune règle.
      </Text>
      <View style={styles.picker}>
        {DIE_ICONS.map((name) => {
          const selected = name === current;
          return (
            <IconButton
              key={name}
              icon={dsIcon(name)}
              size={26}
              mode={selected ? 'contained' : 'outlined'}
              iconColor={selected ? theme.colors.onPrimary : theme.colors.primary}
              containerColor={selected ? theme.colors.primary : undefined}
              onPress={() => onPick(name)}
            />
          );
        })}
      </View>
    </DsDialog>
  );
}

const styles = StyleSheet.create({
  roll: { margin: 0 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bonusLabel: { flex: 1, fontSize: 16 },
  bonusCount: { minWidth: 32, textAlign: 'center', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // One editable die: the number, then its mark button underneath.
  slot: { flexGrow: 0, flexBasis: 72, minWidth: 72, alignItems: 'center' },
  slotMark: { margin: 0 },
  picker: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
});
