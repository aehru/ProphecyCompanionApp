// Step 1 — L'âge: pick a band, or let a D10 pick it (table L'ÂGE). Each band
// shows its modificateurs, which the Caractéristiques step folds in.

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import ChoiceCard from '@/components/creation/choice-card';
import { dsIcon } from '@/components/ui/icon';
import { CARACTERISTIQUES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { AGE_BANDS, type AgeKey, ageFromD10, ageMod } from '@/lib/creation-rules';
import { fmtSignedMod } from '@/lib/modifiers';

/** « FOR -2 · RES -2 · EMP +2 » — or « Aucun modificateur ». */
function modsLine(age: AgeKey): string {
  const parts = CARACTERISTIQUES.flatMap((c) => {
    const m = ageMod(age, c.key);
    return m ? [`${c.abbr} ${fmtSignedMod(m)}`] : [];
  });
  return parts.length ? parts.join(' · ') : 'Aucun modificateur';
}

export default function AgeStep({
  age,
  onChange,
}: {
  age: AgeKey | null;
  onChange: (age: AgeKey) => void;
}) {
  const theme = useProphecyTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const [roll, setRoll] = useState<number | null>(null);

  const rollD10 = () => {
    const n = 1 + Math.floor(Math.random() * 10);
    setRoll(n);
    onChange(ageFromD10(n));
  };

  return (
    <>
      <Text style={muted}>
        Choisissez l’âge de départ, ou laissez un D10 trancher. Il modifie les caractéristiques
        réparties à l’étape suivante.
      </Text>
      {AGE_BANDS.map((b) => (
        <ChoiceCard
          key={b.key}
          testID={`age-${b.key}`}
          selected={b.key === age}
          onPress={() => onChange(b.key)}>
          <View style={styles.head}>
            <Text variant="titleMedium" style={styles.label}>
              {b.label}
            </Text>
            <Text style={muted}>{b.years}</Text>
          </View>
          <Text style={[muted, styles.mods]}>{modsLine(b.key)}</Text>
        </ChoiceCard>
      ))}
      <View style={styles.rollRow}>
        <Button mode="outlined" icon={dsIcon('dice')} onPress={rollD10} testID="age-roll">
          Lancer un D10
        </Button>
        {roll != null ? <Text style={muted}>Résultat : {roll}</Text> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1 },
  mods: { fontSize: 12 },
  rollRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
