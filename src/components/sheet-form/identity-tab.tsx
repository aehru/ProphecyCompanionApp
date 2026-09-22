// Identité tab: the only required field (nom), the concept, the three tendances
// and the biography — plus the delete action when editing an existing sheet.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, HelperText, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import type { ChainMap } from '@/components/sheet-form/field-chain';
import { formStyles } from '@/components/sheet-form/form-styles';
import SectionCard from '@/components/ui/section-card';
import SelectField from '@/components/ui/select-field';
import { CASTES, SANS_CASTE_LABEL, TENDANCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { FormValues } from '@/lib/character-values';

// The empty key IS « Sans Caste » — it round-trips to a NULL column.
const CASTE_OPTIONS = [{ key: '', label: SANS_CASTE_LABEL }, ...CASTES];

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
        {/* « Sans Caste » is the first option, not a clear button: it is a choice
            the player makes, and it is also the state of every sheet that
            predates the field. */}
        {/* Caste and Statut share a row: the Statut is a rung of THAT caste, so
            reading one without the other is reading half a fact. The caste takes
            the width — its labels are words, where a Statut is one digit. */}
        <View style={formStyles.row}>
          <SelectField
            testID="field-caste"
            label="Caste"
            options={CASTE_OPTIONS}
            value={v.caste ?? ''}
            onChange={(key) => onText('caste', key)}
            style={styles.caste}
            inline
          />
          {/* Only inside a caste: « Sans Caste » has no ladder to climb. Hidden
              rather than disabled — a field that cannot move is a puzzle, an
              absent one is an answer. 0 is « aucun Statut », where every new
              character starts. */}
          {v.caste ? (
            <NumberField
              fieldKey="statut"
              label="Statut"
              value={v.statut}
              onChange={setField}
              maxLength={1}
              style={styles.statut}
              {...chain.statut}
            />
          ) : null}
        </View>
        {/* Same rule as the Statut: the oath switches to the caste's black
            ladder, so outside a caste there is nothing for it to change. */}
        {v.caste ? (
          <Checkbox.Item
            testID="field-dark-orders"
            label="Rejoindre Les Ordres Noirs"
            position="leading"
            status={v.darkOrders === '1' ? 'checked' : 'unchecked'}
            onPress={() => onText('darkOrders', v.darkOrders === '1' ? '' : '1')}
          />
        ) : null}
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
        <Button
          testID="delete-character"
          mode="outlined"
          textColor={theme.colors.error}
          onPress={onDelete}
          disabled={busy}>
          Supprimer
        </Button>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // A fixed width for the Statut rather than a flex ratio: both fields carry the
  // same `flexGrow: 1, flexBasis: 90` of their own, and a ratio on top of that
  // still left a one-digit field taking half the row. The caste takes whatever
  // is left — its labels are words (« Commerçant », « Sans Caste »).
  caste: { flexGrow: 1, flexShrink: 1 },
  statut: { flexGrow: 0, flexShrink: 0, flexBasis: 84, minWidth: 84, width: 84 },
});
