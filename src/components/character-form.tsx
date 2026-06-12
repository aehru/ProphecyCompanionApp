import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  type TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
  type TextInputProps,
  View,
} from 'react-native';
import { Button, FAB, SegmentedButtons, Snackbar, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SkillsEditor from '@/components/skills-editor';
import SectionCard from '@/components/ui/section-card';
import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  RESOURCES,
  TENDANCES,
  WOUND_LEVELS,
} from '@/constants/prophecy';
import type { Character, NewCharacter, Skill } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  buildSkillRows,
  type FormValues,
  fromFormValues,
  type SkillRow,
  skillRowsToInput,
  toFormValues,
} from '@/lib/character-values';
import type { SkillInput } from '@/repositories/skills';

// In-page tabs to keep the long sheet from scrolling endlessly. Name stays the
// only required field, validated globally regardless of the active tab.
const FORM_TABS = [
  { key: 'identite', label: 'Identité' },
  { key: 'aptitudes', label: 'Aptitudes' },
  { key: 'combat', label: 'Combat' },
  { key: 'competences', label: 'Compétences' },
] as const;

export default function CharacterForm({
  initial,
  initialSkills,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  initial?: Partial<Character> | null;
  initialSkills?: Skill[];
  submitLabel: string;
  onSubmit: (data: Partial<NewCharacter>, skills: SkillInput[]) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const theme = useProphecyTheme();
  const [v, setV] = useState<FormValues>(() => toFormValues(initial));
  const [skills, setSkills] = useState<SkillRow[]>(() => buildSkillRows(initialSkills ?? []));
  const [skillSearch, setSkillSearch] = useState('');
  const [tab, setTab] = useState<string>('identite');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: string) => (t: string) => setV((prev) => ({ ...prev, [k]: t }));
  // Stable setter so memoized NumberFields don't all re-render on each keystroke.
  const setField = useCallback((k: string, t: string) => setV((prev) => ({ ...prev, [k]: t })), []);

  // Keyboard "next" wiring: chain inputs within a tab so the return key jumps to
  // the following field instead of dismissing the keyboard.
  const fieldRefs = useRef<Record<string, RNTextInput | null>>({});
  const focusNext = (order: string[], key: string) =>
    fieldRefs.current[order[order.indexOf(key) + 1]]?.focus();
  const chain = (order: string[], key: string) => {
    const isLast = order.indexOf(key) === order.length - 1;
    return {
      inputRef: (el: RNTextInput | null) => {
        fieldRefs.current[key] = el;
      },
      returnKeyType: (isLast ? 'done' : 'next') as TextInputProps['returnKeyType'],
      submitBehavior: (isLast ? 'blurAndSubmit' : 'submit') as TextInputProps['submitBehavior'],
      onSubmitEditing: () => focusNext(order, key),
    };
  };

  const identiteOrder = ['nom', 'concept', ...TENDANCES.flatMap((t) => [t.key, `${t.key}Sub`])];
  const aptitudesOrder = [...CARACTERISTIQUES.map((c) => c.key), ...ATTRIBUTS.map((a) => a.key)];
  const combatOrder = [
    ...WOUND_LEVELS.map((w) => `${w.key}Max`),
    ...RESOURCES.map((r) => `${r.key}Max`),
    'initiativeMax',
  ];

  const setSkillValue = useCallback((index: number, t: string) => {
    setSkills((prev) => prev.map((r, i) => (i === index ? { ...r, value: t } : r)));
  }, []);
  const setSkillAttribut = useCallback((index: number, attribut: string) => {
    setSkills((prev) => prev.map((r, i) => (i === index ? { ...r, attribut } : r)));
  }, []);
  const addCustomSkill = useCallback((name: string, attribut: string) => {
    setSkills((prev) => [...prev, { name, attribut, value: '', isCustom: true }]);
  }, []);
  const removeSkill = useCallback((index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function save() {
    setBusy(true);
    try {
      await onSubmit(fromFormValues(v), skillRowsToInput(skills));
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!onDelete) return;
    Alert.alert('Supprimer', 'Supprimer ce personnage ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => onDelete() },
    ]);
  }

  return (
    <View style={styles.root}>
      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <SegmentedButtons
            value={tab}
            onValueChange={setTab}
            density="small"
            buttons={FORM_TABS.map((t) => ({ value: t.key, label: t.label }))}
          />
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {tab === 'identite' ? (
          <>
            <SectionCard title="IDENTITÉ">
              <TextInput
                label="Nom"
                value={v.nom}
                onChangeText={set('nom')}
                mode="outlined"
                ref={(el: unknown) => {
                  fieldRefs.current.nom = el as RNTextInput | null;
                }}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => fieldRefs.current.concept?.focus()}
              />
              <TextInput
                label="Concept"
                value={v.concept}
                onChangeText={set('concept')}
                mode="outlined"
                ref={(el: unknown) => {
                  fieldRefs.current.concept = el as RNTextInput | null;
                }}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focusNext(identiteOrder, 'concept')}
              />
            </SectionCard>

            <SectionCard title="TENDANCES">
              {TENDANCES.map((t) => (
                <View key={t.key} style={styles.row}>
                  <NumberField
                    fieldKey={t.key}
                    label={t.label}
                    value={v[t.key]}
                    onChange={setField}
                    {...chain(identiteOrder, t.key)}
                  />
                  <NumberField
                    fieldKey={`${t.key}Sub`}
                    label={`${t.label} (puces)`}
                    value={v[`${t.key}Sub`]}
                    onChange={setField}
                    {...chain(identiteOrder, `${t.key}Sub`)}
                  />
                </View>
              ))}
            </SectionCard>

            <SectionCard title="BIOGRAPHIE">
              <TextInput
                label="Biographie"
                value={v.biographie}
                onChangeText={set('biographie')}
                mode="outlined"
                multiline
                numberOfLines={4}
              />
            </SectionCard>

            {onDelete ? (
              <Button
                mode="outlined"
                textColor={theme.colors.error}
                onPress={confirmDelete}
                disabled={busy}>
                Supprimer
              </Button>
            ) : null}
          </>
        ) : null}

        {tab === 'aptitudes' ? (
          <>
            <SectionCard title="CARACTÉRISTIQUES">
              <View style={styles.grid}>
                {CARACTERISTIQUES.map((c) => (
                  <NumberField
                    key={c.key}
                    fieldKey={c.key}
                    label={c.abbr}
                    value={v[c.key]}
                    onChange={setField}
                    {...chain(aptitudesOrder, c.key)}
                  />
                ))}
              </View>
            </SectionCard>

            <SectionCard title="ATTRIBUTS">
              <View style={styles.grid}>
                {ATTRIBUTS.map((a) => (
                  <NumberField
                    key={a.key}
                    fieldKey={a.key}
                    label={a.label}
                    value={v[a.key]}
                    onChange={setField}
                    {...chain(aptitudesOrder, a.key)}
                  />
                ))}
              </View>
            </SectionCard>
          </>
        ) : null}

        {tab === 'combat' ? (
          <>
            <SectionCard title="SANTÉ (MAX PAR NIVEAU)">
              <View style={styles.grid}>
                {WOUND_LEVELS.map((w) => (
                  <NumberField
                    key={w.key}
                    fieldKey={`${w.key}Max`}
                    label={w.label}
                    value={v[`${w.key}Max`]}
                    onChange={setField}
                    {...chain(combatOrder, `${w.key}Max`)}
                  />
                ))}
              </View>
            </SectionCard>

            <SectionCard title="RESSOURCES (MAX)">
              <View style={styles.grid}>
                {RESOURCES.map((r) => (
                  <NumberField
                    key={r.key}
                    fieldKey={`${r.key}Max`}
                    label={r.label}
                    value={v[`${r.key}Max`]}
                    onChange={setField}
                    {...chain(combatOrder, `${r.key}Max`)}
                  />
                ))}
                <NumberField
                  fieldKey="initiativeMax"
                  label="Initiative"
                  value={v.initiativeMax}
                  onChange={setField}
                  {...chain(combatOrder, 'initiativeMax')}
                />
              </View>
            </SectionCard>
          </>
        ) : null}

        {tab === 'competences' ? (
          <SkillsEditor
            rows={skills}
            search={skillSearch}
            onSearch={setSkillSearch}
            onChangeValue={setSkillValue}
            onChangeAttribut={setSkillAttribut}
            onAddCustom={addCustomSkill}
            onRemove={removeSkill}
          />
        ) : null}
      </ScrollView>

      <FAB
        icon="content-save"
        label={submitLabel}
        onPress={save}
        disabled={busy || v.nom.trim() === ''}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
      />
      <Snackbar visible={saved} onDismiss={() => setSaved(false)} duration={1500}>
        Enregistré
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  tabsBar: { paddingHorizontal: 16, paddingTop: 12 },
  container: { padding: 16, gap: 12, paddingBottom: 96 },
  row: { flexDirection: 'row', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
