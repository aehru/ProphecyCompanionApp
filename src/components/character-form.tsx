import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Snackbar } from 'react-native-paper';

import AptitudesTab from '@/components/sheet-form/aptitudes-tab';
import CombatTab from '@/components/sheet-form/combat-tab';
import { useFieldChains } from '@/components/sheet-form/field-chain';
import IdentityTab from '@/components/sheet-form/identity-tab';
import MagicTab from '@/components/sheet-form/magic-tab';
import AppFab from '@/components/ui/app-fab';
import TabPage from '@/components/ui/tab-page';
import TabPager from '@/components/ui/tab-pager';
import type { Character, NewCharacter } from '@/db/schema';
import { Alert } from '@/lib/alert';
import { type FormValues, fromFormValues, toFormValues } from '@/lib/character-values';

// Swipeable in-page tabs (<TabPager>) to keep the long sheet from scrolling endlessly. Name stays the
// only required field, validated globally regardless of the active tab.
// Skills are edited post-creation in the Compétences tab's edit mode, not here.
const FORM_TABS = ['Identité', 'Aptitudes', 'Combat', 'Magie'];

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
  const [v, setV] = useState<FormValues>(() => toFormValues(initial));
  const [tab, setTab] = useState(0);
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
      setTab(0);
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

  const renderPage = (index: number) => (
    <TabPage>
      {index === 0 ? (
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
      {index === 1 ? <AptitudesTab v={v} chain={chains.aptitudes} setField={setField} /> : null}
      {index === 2 ? <CombatTab v={v} chain={chains.combat} setField={setField} /> : null}
      {index === 3 ? <MagicTab v={v} chain={chains.magie} setField={setField} /> : null}
    </TabPage>
  );

  return (
    <View style={styles.root}>
      <TabPager labels={FORM_TABS} active={tab} onChange={setTab} renderPage={renderPage} />

      <AppFab
        icon="content-save"
        label={submitLabel}
        testID="fab-save-character"
        onPress={save}
        disabled={busy}
      />
      <Snackbar visible={saved} onDismiss={() => setSaved(false)} duration={1500}>
        Enregistré
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
