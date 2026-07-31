// Combat tab: the maximums only — wound boxes per level, resource pools and the
// initiative dice count. The current values are played on the Fiche.

import React from 'react';
import { View } from 'react-native';

import NumberField from '@/components/number-field';
import type { ChainMap } from '@/components/sheet-form/field-chain';
import { formStyles } from '@/components/sheet-form/form-styles';
import SectionCard from '@/components/ui/section-card';
import { RESOURCES, WOUND_LEVELS } from '@/constants/prophecy';
import type { FormValues } from '@/lib/character-values';

export default function CombatTab({
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
      <SectionCard title="SANTÉ (MAX PAR NIVEAU)">
        <View style={formStyles.grid}>
          {WOUND_LEVELS.map((w) => (
            <NumberField
              key={w.key}
              fieldKey={`${w.key}Max`}
              label={w.label}
              value={v[`${w.key}Max`]}
              onChange={setField}
              {...chain[`${w.key}Max`]}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard title="RESSOURCES (MAX)">
        <View style={formStyles.grid}>
          {RESOURCES.map((r) => (
            <NumberField
              key={r.key}
              fieldKey={`${r.key}Max`}
              label={r.label}
              value={v[`${r.key}Max`]}
              onChange={setField}
              {...chain[`${r.key}Max`]}
            />
          ))}
          <NumberField
            fieldKey="initiativeMax"
            label="Initiative"
            value={v.initiativeMax}
            onChange={setField}
            {...chain.initiativeMax}
          />
        </View>
      </SectionCard>
    </>
  );
}
