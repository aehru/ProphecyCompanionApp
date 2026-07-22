import React from 'react';
import { StyleSheet, View, type TextInput as RNTextInput } from 'react-native';

import NumberField from '@/components/number-field';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { MONEY } from '@/constants/prophecy';

/** Keyboard "next" wiring the fiche hands down for each editable field. */
export type FieldChain = (key: string) => {
  inputRef: (el: RNTextInput | null) => void;
  returnKeyType: 'done' | 'next';
  submitBehavior: 'blurAndSubmit' | 'submit';
  onSubmitEditing: () => void;
};

/**
 * ARGENT: the four Drac coin counts. Read mode shows tiles; edit mode swaps in
 * numeric fields chained to each other by the keyboard's "next" key (the fiche
 * owns the chain because the order spans several sections).
 */
export default function MoneySection({
  valueOf,
  onChange,
  chain,
  editing,
}: {
  valueOf: (key: string) => string;
  onChange: (key: string, text: string) => void;
  chain: FieldChain;
  editing: boolean;
}) {
  return (
    <SectionCard title="ARGENT" icon="coin">
      <View style={styles.grid}>
        {MONEY.map((m) =>
          editing ? (
            <NumberField
              key={m.key}
              fieldKey={m.key}
              label={m.abbr}
              value={valueOf(m.key)}
              onChange={onChange}
              style={styles.coin}
              {...chain(m.key)}
            />
          ) : (
            <StatChip key={m.key} label={m.abbr} value={valueOf(m.key)} style={styles.coin} />
          ),
        )}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  coin: { flexGrow: 1, flexBasis: 64, minWidth: 64 },
});
