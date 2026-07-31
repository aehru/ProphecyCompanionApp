// Magie tab: the pools' maximums (global reserve, spheres) and the disciplines.
// Spending them happens on the Magie screen.

import React from 'react';
import { View } from 'react-native';

import NumberField from '@/components/number-field';
import type { ChainMap } from '@/components/sheet-form/field-chain';
import { formStyles } from '@/components/sheet-form/form-styles';
import SectionCard from '@/components/ui/section-card';
import { DISCIPLINES, SPHERES } from '@/constants/prophecy';
import type { FormValues } from '@/lib/character-values';

export default function MagicTab({
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
      <SectionCard title="RÉSERVE DE MAGIE (MAX)">
        <NumberField
          fieldKey="reserveMagiqueMax"
          label="Réserve max (défaut = Volonté)"
          value={v.reserveMagiqueMax}
          onChange={setField}
          {...chain.reserveMagiqueMax}
        />
      </SectionCard>

      <SectionCard title="SPHÈRES (MAX)">
        <View style={formStyles.grid}>
          {SPHERES.map((s) => (
            <NumberField
              key={s.key}
              fieldKey={`${s.key}Max`}
              label={s.label}
              value={v[`${s.key}Max`]}
              onChange={setField}
              style={formStyles.col2}
              {...chain[`${s.key}Max`]}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="DISCIPLINES">
        <View style={formStyles.grid}>
          {DISCIPLINES.map((d) => (
            <NumberField
              key={d.key}
              fieldKey={d.key}
              label={d.label}
              value={v[d.key]}
              onChange={setField}
              style={formStyles.col2}
              {...chain[d.key]}
            />
          ))}
        </View>
      </SectionCard>
    </>
  );
}
