import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SegmentedButtons, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AptitudesTab from '@/components/sheet-form/aptitudes-tab';
import CombatTab from '@/components/sheet-form/combat-tab';
import { useFieldChains } from '@/components/sheet-form/field-chain';
import IdentityTab from '@/components/sheet-form/identity-tab';
import MagicTab from '@/components/sheet-form/magic-tab';
import AppFab from '@/components/ui/app-fab';
import type { Character, NewCharacter } from '@/db/schema';
import { contentWidth } from '@/hooks/use-layout';
import { type FormValues, fromFormValues, toFormValues } from '@/lib/character-values';

// In-page tabs to keep the long sheet from scrolling endlessly. Name stays the
// only required field, validated globally regardless of the active tab.
// Skills are edited post-creation in the Compétences tab's edit mode, not here.
const FORM_TABS = [
  { key: 'identite', label: 'Identité' },
  { key: 'aptitudes', label: 'Aptitudes' },
  { key: 'combat', label: 'Combat' },
  { key: 'magie', label: 'Magie' },
] as const;

export default function CharacterForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  initial?: Partial<Character> | null;
  submitLabel: string;
  onSubmit: (data: Partial<NewCharacter>) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const insets = useSafeAreaInsets();
  // Match AppFab: skip the safe-area inset when inside a tab navigator, where
  // the tab bar already offsets the screen.
  const inTabBar = React.useContext(BottomTabBarHeightContext) != null;
  const scrollPadBottom = 96 + (inTabBar ? 0 : insets.bottom);
  const [v, setV] = useState<FormValues>(() => toFormValues(initial));
  const [tab, setTab] = useState<string>('identite');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState(false);
  const nameMissing = v.nom.trim() === '';
  // Stable setter so memoized NumberFields don't all re-render on each keystroke.
  const setField = useCallback((k: string, t: string) => setV((prev) => ({ ...prev, [k]: t })), []);
  const setText = (key: string, text: string) => {
    setField(key, text);
    if (key === 'nom' && nameError && text.trim() !== '') setNameError(false);
  };

  const { chains, registerRef, focus } = useFieldChains();

  async function save() {
    if (nameMissing) {
      // Surface the missing required field instead of silently doing nothing.
      setNameError(true);
      setTab('identite');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(fromFormValues(v));
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

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.container, { paddingBottom: scrollPadBottom }, contentWidth]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        {tab === 'identite' ? (
          <IdentityTab
            v={v}
            chain={chains.identite}
            setField={setField}
            onText={setText}
            nameError={nameError && nameMissing}
            registerRef={registerRef}
            focus={focus}
            busy={busy}
            onDelete={onDelete ? confirmDelete : undefined}
          />
        ) : null}

        {tab === 'aptitudes' ? (
          <AptitudesTab v={v} chain={chains.aptitudes} setField={setField} />
        ) : null}

        {tab === 'combat' ? <CombatTab v={v} chain={chains.combat} setField={setField} /> : null}

        {tab === 'magie' ? <MagicTab v={v} chain={chains.magie} setField={setField} /> : null}
      </KeyboardAwareScrollView>

      <AppFab icon="content-save" label={submitLabel} onPress={save} disabled={busy} />
      <Snackbar visible={saved} onDismiss={() => setSaved(false)} duration={1500}>
        Enregistré
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabsBar: { paddingHorizontal: 16, paddingTop: 12 },
  container: { padding: 16, gap: 12 },
});
