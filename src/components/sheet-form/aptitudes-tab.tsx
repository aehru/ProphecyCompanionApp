// Aptitudes tab: the four attributs on one row, then the caractéristiques.

import React from 'react';
import { View } from 'react-native';

import NumberField from '@/components/number-field';
import type { ChainMap } from '@/components/sheet-form/field-chain';
import { formStyles } from '@/components/sheet-form/form-styles';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUTS, CARACTERISTIQUES } from '@/constants/prophecy';
import type { FormValues } from '@/lib/character-values';

export default function AptitudesTab({
  v,
  chain,
  setField,
}: {
  v: FormValues;
  chain: ChainMap;
  setField: (key: string, text: string) => void;
}) {
  return (
    <>
      <SectionCard title="ATTRIBUTS">
        <View style={formStyles.grid}>
          {ATTRIBUTS.map((a) => (
            <NumberField
              key={a.key}
              fieldKey={a.key}
              label={a.label}
              value={v[a.key]}
              onChange={setField}
              style={formStyles.col4}
              {...chain[a.key]}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="CARACTÉRISTIQUES">
        <View style={formStyles.grid}>
          {CARACTERISTIQUES.map((c) => (
            <NumberField
              key={c.key}
              fieldKey={c.key}
              label={c.abbr}
              value={v[c.key]}
              onChange={setField}
              style={formStyles.col2}
              {...chain[c.key]}
            />
          ))}
        </View>
      </SectionCard>
    </>
  );
}
