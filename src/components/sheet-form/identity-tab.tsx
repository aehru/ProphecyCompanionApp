// Identité tab: the only required field (nom), the concept, the three tendances
// and the biography — plus the delete action when editing an existing sheet.

import React from 'react';
import { View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import type { ChainMap } from '@/components/sheet-form/field-chain';
import { formStyles } from '@/components/sheet-form/form-styles';
import SectionCard from '@/components/ui/section-card';
import { TENDANCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { FormValues } from '@/lib/character-values';

export default function IdentityTab({
  v,
  chain,
  setField,
  onText,
  nameError,
  registerRef,
  focus,
  busy,
  onDelete,
}: {
  v: FormValues;
  chain: ChainMap;
  setField: (key: string, text: string) => void;
  onText: (key: string, text: string) => void;
  /** The name was left empty on save — show it in red until it is filled. */
  nameError: boolean;
  registerRef: (key: string) => (el: unknown) => void;
  focus: (key: string) => void;
  busy: boolean;
  onDelete?: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <>
      <SectionCard title="IDENTITÉ">
        <TextInput
          testID="field-nom"
          label="Nom *"
          value={v.nom}
          onChangeText={(t) => onText('nom', t)}
          mode="outlined"
          error={nameError}
          ref={registerRef('nom')}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focus('concept')}
        />
        {nameError ? (
          <HelperText type="error" visible>
            Le nom est obligatoire
          </HelperText>
        ) : null}
        <TextInput
          label="Concept"
          value={v.concept}
          onChangeText={(t) => onText('concept', t)}
          mode="outlined"
          ref={registerRef('concept')}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => focus(TENDANCES[0].key)}
        />
      </SectionCard>

      <SectionCard title="TENDANCES">
        {TENDANCES.map((t) => (
          <View key={t.key} style={formStyles.row}>
            <NumberField
              fieldKey={t.key}
              label={t.label}
              value={v[t.key]}
              onChange={setField}
              {...chain[t.key]}
            />
            <NumberField
              fieldKey={`${t.key}Sub`}
              label={`${t.label} (puces)`}
              value={v[`${t.key}Sub`]}
              onChange={setField}
              {...chain[`${t.key}Sub`]}
            />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="BIOGRAPHIE">
        <TextInput
          label="Biographie"
          value={v.biographie}
          onChangeText={(t) => onText('biographie', t)}
          mode="outlined"
          multiline
          style={{ minHeight: 96, maxHeight: 288 }}
        />
      </SectionCard>

      {onDelete ? (
        <Button mode="outlined" textColor={theme.colors.error} onPress={onDelete} disabled={busy}>
          Supprimer
        </Button>
      ) : null}
    </>
  );
}
