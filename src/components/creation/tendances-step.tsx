// The three tendances: value on +/−, puces by tapping the dots. A nation
// d'origine proposes the values (TENDANCES DE DÉPART); they stay editable.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { TendanceGauge } from '@/components/tendances-circles';
import { dsIcon } from '@/components/ui/icon';
import SelectField from '@/components/ui/select-field';
import { MAX_PUCES, TENDANCE_BY_KEY, TENDANCES, type TendanceKey } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { type FormValues, parseInteger } from '@/lib/character-values';
import { freeTendancesLeft, stepValue, tapPuce } from '@/lib/creation';
import { type AgeKey, ageBand, NATIONS, type NationKey, tendanceStart } from '@/lib/creation-rules';

const TAGLINE: Record<TendanceKey, string> = {
  dragon: 'Honneur, tradition, magie',
  fatalite: 'Ambition, pouvoir, ombre',
  homme: 'Libre arbitre, humanité',
};

const DOTS = Array.from({ length: MAX_PUCES }, (_, i) => i);

const NATION_OPTIONS = [{ key: '', label: 'Non précisée' }, ...NATIONS];

export default function TendancesStep({
  v,
  setField,
  nation,
  age,
  onPickNation,
}: {
  v: FormValues;
  setField: (key: string, text: string) => void;
  nation: NationKey | null;
  age: AgeKey | null;
  /** Records the nation and writes its proposal into the tendances. */
  onPickNation: (nation: NationKey | null) => void;
}) {
  const theme = useProphecyTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const total = TENDANCES.reduce((sum, t) => sum + parseInteger(v[t.key]), 0);
  return (
    <>
      <Text style={muted}>Les trois forces qui tiraillent le personnage.</Text>
      <SelectField
        testID="field-nation"
        label="Nation d’origine"
        options={NATION_OPTIONS}
        value={nation ?? ''}
        onChange={(k) => onPickNation((k || null) as NationKey | null)}
        inline
      />
      {nation ? <FreePointsNote v={v} nation={nation} age={age} /> : null}
      {TENDANCES.map((t) => (
        <TendanceCard key={t.key} tKey={t.key} v={v} setField={setField} />
      ))}
      <Text style={[muted, styles.total]}>
        Total {total} · les puces se règlent en touchant les points
      </Text>
    </>
  );
}

/** What the table gave, and the « L » points still to place by hand. */
function FreePointsNote({ v, nation, age }: { v: FormValues; nation: NationKey; age: AgeKey | null }) {
  const theme = useProphecyTheme();
  const left = freeTendancesLeft(v, tendanceStart(nation, age));
  const band = (ageBand(age)?.label ?? 'Adulte').toLowerCase();
  const status =
    left > 0
      ? `${left} point${left > 1 ? 's' : ''} libre${left > 1 ? 's' : ''} à placer`
      : left < 0
        ? `${-left} point${left < -1 ? 's' : ''} au-delà de la table`
        : 'tous les points sont placés';
  return (
    <Text
      testID="tendances-free"
      style={{ color: left < 0 ? theme.colors.error : theme.colors.onSurfaceVariant }}>
      Proposition pour un {band} : {status}.
    </Text>
  );
}

function TendanceCard({
  tKey,
  v,
  setField,
}: {
  tKey: TendanceKey;
  v: FormValues;
  setField: (key: string, text: string) => void;
}) {
  const theme = useProphecyTheme();
  const t = TENDANCE_BY_KEY[tKey];
  const value = parseInteger(v[tKey]);
  const subKey = `${tKey}Sub`;
  const sub = parseInteger(v[subKey]);
  return (
    <View
      testID={`tendance-${tKey}`}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.border }]}>
      <TendanceGauge tKey={tKey} value={value} sub={sub} size={64} tone="surface" showLabel={false} />
      <View style={styles.body}>
        <Text variant="titleMedium">{t.label}</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{TAGLINE[tKey]}</Text>
        <View style={styles.dots}>
          {DOTS.map((i) => (
            <Pressable
              key={i}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${t.label} : ${i + 1} puce${i ? 's' : ''}`}
              onPress={() => setField(subKey, tapPuce(v[subKey], i))}
              style={[
                styles.dot,
                // Filled in the tendance's colour; empty ones in the theme outline,
                // since Fatalité's dark green vanishes on the dark background.
                i < sub
                  ? { borderColor: t.border, backgroundColor: t.color }
                  : { borderColor: theme.colors.outline, backgroundColor: 'transparent' },
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.steps}>
        <IconButton
          icon={dsIcon('plus')}
          mode="outlined"
          size={18}
          accessibilityLabel={`${t.label} plus un`}
          onPress={() => setField(tKey, stepValue(v[tKey], 1))}
        />
        <IconButton
          icon="minus"
          mode="outlined"
          size={18}
          disabled={value <= 0}
          accessibilityLabel={`${t.label} moins un`}
          onPress={() => setField(tKey, stepValue(v[tKey], -1))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  body: { flex: 1, gap: 4 },
  // Two rows of five: width = 5 dots + 4 gaps, so the wrap breaks at five.
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, width: 5 * 12 + 4 * 6 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.2 },
  steps: { gap: 0 },
  total: { textAlign: 'center' },
});
