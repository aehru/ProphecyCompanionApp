// Identité — who the character is: nom (the one required field), concept, a
// portrait, and whether a Great Dragon chose them. Caste and Statut have their
// own step; the biographie stays on the sheet.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

import CreationAvatar from '@/components/creation/creation-avatar';
import NumberField from '@/components/number-field';
import { formStyles } from '@/components/sheet-form/form-styles';
import SectionCard from '@/components/ui/section-card';
import SelectField from '@/components/ui/select-field';
import { GREAT_DRAGONS } from '@/constants/prophecy';
import type { FormValues } from '@/lib/character-values';

// The empty key is « Aucun », a NULL `chosenBy` — same list as the full form.
const DRAGON_OPTIONS = [{ key: '', label: 'Aucun' }, ...GREAT_DRAGONS];

export default function IdentityStep({
  v,
  setField,
  nameError,
  avatarUri,
  onPickAvatar,
}: {
  v: FormValues;
  setField: (key: string, text: string) => void;
  /** « Suivant » was pressed with no name. */
  nameError: boolean;
  avatarUri: string | null;
  onPickAvatar: () => void;
}) {
  return (
    <>
      <SectionCard title="IDENTITÉ">
        <View style={styles.identity}>
          <CreationAvatar
            nom={v.nom}
            caste={v.caste}
            uri={avatarUri}
            size={64}
            onPress={onPickAvatar}
          />
          <View style={styles.fields}>
            <TextInput
              testID="field-nom"
              label="Nom *"
              value={v.nom}
              onChangeText={(t) => setField('nom', t)}
              error={nameError}
              autoFocus
            />
            {nameError ? (
              <HelperText type="error" visible>
                Le nom est obligatoire
              </HelperText>
            ) : null}
          </View>
        </View>
        <TextInput
          label="Concept"
          placeholder="Chevalier errant, marchande d’épices…"
          value={v.concept}
          onChangeText={(t) => setField('concept', t)}
        />
      </SectionCard>

      <SectionCard title="ÉLU">
        {/* Élu: the dragon, then the Lien beside it — hidden at « Aucun ». */}
        <View style={formStyles.row}>
          <SelectField
            testID="field-chosen-by"
            label="Élu de"
            options={DRAGON_OPTIONS}
            value={v.chosenBy ?? ''}
            onChange={(key) => setField('chosenBy', key)}
            style={styles.grow}
            inline
          />
          {v.chosenBy ? (
            <NumberField
              fieldKey="bond"
              label="Lien"
              value={v.bond}
              onChange={setField}
              maxLength={1}
              style={styles.bond}
            />
          ) : null}
        </View>
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fields: { flex: 1 },
  grow: { flexGrow: 1, flexShrink: 1 },
  bond: { flexGrow: 0, flexShrink: 0, flexBasis: 84, minWidth: 84, width: 84 },
});
