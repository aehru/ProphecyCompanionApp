import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formulaResult, parseFormula, parsePrerequisites } from '@/lib/formula';
import { fmtSignedMod } from '@/lib/modifiers';

/**
 * A caractéristique's value on the sheet.
 *
 * Every row that takes one takes it **optionally**: the same views render a
 * catalogue entry browsed with no character in context, where there is no sheet
 * to read. Absent, a formula keeps its carac terms symbolic (« 3 + FOR × 2 »,
 * which the engine already does for any resolver that declines) and a prérequis
 * is printed as neither met nor unmet — unknown is not a failure.
 */
export type CaracValue = (caracKey: string) => number;
/**
 * Net wound + temporary-effect modifier for a caractéristique. Folded into the
 * carac value before any multiplier in a damage formula.
 */
export type CaracModifier = (caracKey: string) => number;

/**
 * The label/value rows every gear detail is built from — weapons, armures and
 * boucliers all print the same « Prérequis / Création / Spécial » shape, and a
 * catalogue preview prints it too. They lived three times over inside the cards
 * before the catalogue needed them as well.
 */
export function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useProphecyTheme();
  return (
    <View style={gearDetailStyles.row}>
      <Text style={[gearDetailStyles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={gearDetailStyles.value}>{value}</Text>
    </View>
  );
}

/**
 * A formula field (dégâts, portées): the raw formula plus its result for this
 * character. The badge is the raw carac modifier (wound + effects), shown BEFORE
 * any multiplier: a +2 on `FOR x2` reads "+2", not "+4".
 */
export function FormulaRow({
  label,
  raw,
  caracValue,
  // Only the damage row passes this; ranges ignore combat maluses.
  caracModifier,
}: {
  label: string;
  raw: string | null | undefined;
  caracValue?: CaracValue;
  caracModifier?: CaracModifier;
}) {
  const theme = useProphecyTheme();
  if (raw == null || raw.trim() === '') return null;
  const result = formulaResult(raw, { carac: caracValue, caracModifier });
  const delta = formulaCaracMod(raw, caracModifier);
  const modColor = delta > 0 ? theme.colors.primary : theme.colors.error;
  return (
    <View style={gearDetailStyles.row}>
      <Text style={[gearDetailStyles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={gearDetailStyles.formulaCol}>
        <Text>{raw.trim()}</Text>
        {result != null && result !== raw.trim() ? (
          <View style={gearDetailStyles.resultRow}>
            <Text style={[gearDetailStyles.result, { color: theme.colors.primary }]}>= {result}</Text>
            {delta !== 0 ? (
              <>
                <IconButton
                  icon="alert-circle"
                  size={14}
                  iconColor={modColor}
                  style={gearDetailStyles.modIcon}
                />
                <Text style={[gearDetailStyles.modNote, { color: modColor }]}>
                  ({fmtSignedMod(delta)})
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Prérequis, each green when the character meets it and red when they don't —
 * and neutral with no character to check them against, which is a third state
 * rather than a failure (see {@link CaracValue}).
 */
export function PrerequisitesRow({
  raw,
  caracValue,
}: {
  raw: string | null | undefined;
  caracValue?: CaracValue;
}) {
  const theme = useProphecyTheme();
  const prereqs = parsePrerequisites(raw ?? '');
  if (prereqs.length === 0) return null;
  return (
    <View style={gearDetailStyles.row}>
      <Text style={[gearDetailStyles.label, { color: theme.colors.onSurfaceVariant }]}>
        Prérequis
      </Text>
      <View style={gearDetailStyles.prereqWrap}>
        {prereqs.map((p) => {
          const met = caracValue && caracValue(p.carac) >= p.min;
          const color = !caracValue
            ? theme.colors.onSurface
            : met
              ? theme.colors.primary
              : theme.colors.error;
          return (
            <Text key={p.carac} style={[gearDetailStyles.prereq, { color }]}>
              {p.abbr} {p.min}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/**
 * True when any prérequis of `raw` is out of the character's reach. False with
 * no character: this drives the red alert tile in the catalogue, and flagging
 * every entry as unreachable while browsing the rulebook would be a lie.
 */
export function prerequisitesUnmet(
  raw: string | null | undefined,
  caracValue?: CaracValue,
): boolean {
  if (!caracValue) return false;
  return parsePrerequisites(raw ?? '').some((p) => caracValue(p.carac) < p.min);
}

/**
 * Sum of the raw carac modifiers for the distinct caractéristiques a formula
 * uses — the value applied to each carac before its multiplier. For a
 * single-carac formula (the common case) this is just that carac's modifier.
 */
function formulaCaracMod(raw: string, caracModifier?: CaracModifier): number {
  if (!caracModifier) return 0;
  const parsed = parseFormula(raw);
  if (!parsed.ok) return 0;
  const keys = new Set<string>();
  for (const t of parsed.formula.terms) if (t.kind === 'carac') keys.add(t.carac);
  let total = 0;
  for (const k of keys) total += caracModifier(k);
  return total;
}

export const gearDetailStyles = StyleSheet.create({
  detail: { gap: 8, paddingLeft: 2, paddingBottom: 12 },
  detailEdit: { alignSelf: 'flex-start', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 92, fontSize: 14 },
  value: { flex: 1, fontSize: 15 },
  formulaCol: { flex: 1 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  result: { fontSize: 15, fontWeight: '700' },
  modIcon: { margin: 0 },
  modNote: { fontSize: 13, fontWeight: '700' },
  prereqWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prereq: { fontSize: 15, fontWeight: '600' },
  equipBtns: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // The compétence line (weapons only, but it shares the label column above).
  skillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  skillName: { fontSize: 15 },
  untrained: { fontSize: 12, fontStyle: 'italic' },
  breakdown: { fontSize: 13 },
});
