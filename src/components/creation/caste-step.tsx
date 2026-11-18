// Caste — the caste (a card per caste, accented by its patron dragon) and the
// Statut the character starts at.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Checkbox, Text } from 'react-native-paper';

import ChoiceCard from '@/components/creation/choice-card';
import SectionCard from '@/components/ui/section-card';
import {
  CASTE_LABEL,
  CASTE_PATRON,
  CASTES,
  DRAGON_LABEL,
  SANS_CASTE_LABEL,
  STATUT_MAX,
  type CasteKey,
} from '@/constants/prophecy';
import { useCasteAccent } from '@/hooks/use-caste-accent';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { type FormValues, parseInteger } from '@/lib/character-values';
import { rungLabel, statutFor } from '@/lib/statut';

const LEVELS = Array.from({ length: STATUT_MAX + 1 }, (_, i) => i);

export default function CasteStep({
  v,
  setField,
}: {
  v: FormValues;
  setField: (key: string, text: string) => void;
}) {
  const theme = useProphecyTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const niveau = parseInteger(v.statut);
  const dark = v.darkOrders === '1';
  const rung = statutFor(v.caste, niveau, dark);

  const pickCaste = (key: string) => {
    setField('caste', key);
    // A Statut is a rung of THAT caste: none outside one.
    if (!key) {
      setField('statut', '');
      setField('darkOrders', '');
    }
  };

  return (
    <>
      <Text style={muted}>
        La caste dit d’où vient le personnage et ce qu’il peut devenir. Chacune sert un Grand
        Dragon.
      </Text>
      <View style={styles.grid}>
        {CASTES.map((c) => (
          <CasteCard
            key={c.key}
            caste={c.key}
            selected={v.caste === c.key}
            onPress={() => pickCaste(c.key)}
          />
        ))}
      </View>
      <Button
        mode={v.caste ? 'text' : 'contained-tonal'}
        onPress={() => pickCaste('')}
        testID="caste-none">
        {SANS_CASTE_LABEL}
      </Button>

      {v.caste ? (
        <SectionCard title="STATUT DE DÉPART" helper={CASTE_LABEL[v.caste]}>
          <RungPicker value={niveau} onChange={(n) => setField('statut', String(n))} />
          {rung ? (
            <View style={styles.rung}>
              <Text variant="titleMedium">{rungLabel(rung)}</Text>
              <Text style={muted}>Requis : {rung.requis}</Text>
            </View>
          ) : (
            <Text style={muted}>
              {niveau === 0 ? 'Aucun Statut — le point de départ habituel.' : 'Statuts pas encore saisis.'}
            </Text>
          )}
          <Checkbox.Item
            testID="field-dark-orders"
            label="Rejoindre Les Ordres Noirs"
            position="leading"
            status={dark ? 'checked' : 'unchecked'}
            onPress={() => setField('darkOrders', dark ? '' : '1')}
          />
        </SectionCard>
      ) : null}
    </>
  );
}

/**
 * 0–5 as six equal cells. Not Paper's SegmentedButtons: six of those carry a
 * minimum width each and overflow a phone.
 */
function RungPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const theme = useProphecyTheme();
  const c = theme.colors;
  return (
    <View style={styles.rungs} accessibilityRole="radiogroup">
      {LEVELS.map((n) => {
        const on = n === value;
        return (
          <Pressable
            key={n}
            testID={`statut-${n}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(n)}
            style={[
              styles.rungCell,
              {
                backgroundColor: on ? c.secondaryContainer : 'transparent',
                borderColor: on ? c.primary : theme.prophecy.border,
              },
            ]}>
            <Text style={{ color: on ? c.primary : c.onSurface, fontWeight: '600' }}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CasteCard({
  caste,
  selected,
  onPress,
}: {
  caste: CasteKey;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  const accent = useCasteAccent(caste) ?? theme.colors.primary;
  return (
    <ChoiceCard
      testID={`caste-${caste}`}
      selected={selected}
      accent={accent}
      onPress={onPress}
      style={styles.card}>
      <Text variant="titleMedium" numberOfLines={1}>
        {CASTE_LABEL[caste]}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        {DRAGON_LABEL[CASTE_PATRON[caste]]}
      </Text>
    </ChoiceCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Two per row: half the row minus half the gap.
  card: { flexBasis: '47%', flexGrow: 1 },
  rung: { gap: 2 },
  rungs: { flexDirection: 'row', gap: 6 },
  rungCell: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
