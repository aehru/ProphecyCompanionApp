import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import ChipSelect from '@/components/ui/chip-select';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import { VALEURS, type ValeurKey } from '@/constants/prophecy';
import type { XpAward } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { awardTotal, clampScore, type ValeurScores } from '@/lib/xp';

export type ScenarioDialogMode = 'start' | 'end' | 'edit';

export type ScenarioValues = { label: string; chosenValeur: ValeurKey; scores: ValeurScores };

const TITLES: Record<ScenarioDialogMode, string> = {
  start: 'Début de scénario',
  end: 'Fin de scénario',
  edit: 'Modifier le scénario',
};

/**
 * The two halves of a scénario's Expérience, plus the edit of a past one:
 * `start` asks for the Valeur the player stakes (and an optional name), `end`
 * for the GM's five 0–5 scores, `edit` for both. Mount it with a `key` per
 * opening — its fields seed from `initial` once and do not follow it.
 */
export default function ScenarioDialog({
  mode,
  initial,
  onDismiss,
  onSubmit,
  onDelete,
}: {
  mode: ScenarioDialogMode;
  initial?: XpAward;
  onDismiss: () => void;
  onSubmit: (values: ScenarioValues) => void;
  /** Offers « Supprimer » beside the commit button (the history's edit). */
  onDelete?: () => void;
}) {
  const theme = useProphecyTheme();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [valeur, setValeur] = useState<ValeurKey | undefined>(initial?.chosenValeur);
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(VALEURS.map((v) => [v.key, String(initial?.[v.key] ?? 0)])),
  );

  const numeric = Object.fromEntries(
    VALEURS.map((v) => [v.key, clampScore(Number(scores[v.key]))]),
  ) as ValeurScores;
  const showValeur = mode !== 'end';
  const showScores = mode !== 'start';

  return (
    <DsDialog
      visible
      onDismiss={onDismiss}
      title={TITLES[mode]}
      dismiss={<Button onPress={onDismiss}>Annuler</Button>}
      actions={
        <>
          {onDelete ? (
            <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete}>
              Supprimer
            </Button>
          ) : null}
          <Button
            mode="contained"
            icon={dsIcon(mode === 'start' ? 'plus' : 'check')}
            disabled={!valeur}
            onPress={() => valeur && onSubmit({ label: label.trim(), chosenValeur: valeur, scores: numeric })}>
            {mode === 'start' ? 'Commencer' : 'Enregistrer'}
          </Button>
        </>
      }>
      {showValeur ? (
        <>
          <TextInput label="Nom du scénario (facultatif)" value={label} onChangeText={setLabel} />
          <ChipSelect
            label="Valeur choisie"
            info="Les points que le MJ accorde dans cette Valeur comptent double."
            options={VALEURS}
            value={valeur ?? ''}
            onChange={(k) => setValeur(k as ValeurKey)}
          />
        </>
      ) : null}
      {showScores && valeur ? (
        <>
          {mode === 'end' ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Points du MJ, de 0 à 5. Valeur choisie : {VALEURS.find((v) => v.key === valeur)?.label}{' '}
              (×2).
            </Text>
          ) : null}
          <View style={styles.grid}>
            {VALEURS.map((v) => (
              <NumberField
                key={v.key}
                fieldKey={v.key}
                label={v.key === valeur ? `${v.label} ×2` : v.label}
                value={scores[v.key]}
                maxLength={1}
                onChange={(k, t) => setScores((s) => ({ ...s, [k]: t }))}
                style={styles.cell}
              />
            ))}
          </View>
          <Text variant="titleMedium">Total : {awardTotal({ ...numeric, chosenValeur: valeur })} XP</Text>
        </>
      ) : null}
    </DsDialog>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexGrow: 1, flexBasis: 120, minWidth: 120 },
});
