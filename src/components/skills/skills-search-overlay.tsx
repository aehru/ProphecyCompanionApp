// Global search over the Compétences tab, as a full-screen layer above the
// pager.
//
// Search is GLOBAL (« I forget which attribut Esquive is under ») while the
// pager is per-attribut, so the two can't share a surface: the overlay covers
// the strip and the pages, and results are listed across every attribut. The
// pager underneath stays mounted, so closing puts the user back on the tab —
// and the scroll offset — they left.

import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { TextInput } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function SkillsSearchOverlay({
  value,
  onChange,
  onClose,
  children,
}: {
  value: string;
  onChange: (text: string) => void;
  /** Closes the layer AND clears the query — the pager comes back untouched. */
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useProphecyTheme();

  // Android back closes the search rather than leaving the character screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
      <View style={styles.bar}>
        <TextInput
          label="Rechercher une compétence"
          value={value}
          onChangeText={onChange}
          mode="outlined"
          dense
          autoFocus
          autoCorrect={false}
          left={<TextInput.Icon icon={dsIcon('search')} />}
          right={<TextInput.Icon icon={dsIcon('close')} onPress={onClose} />}
        />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, contentWidth]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { padding: 12, paddingBottom: 8 },
  // paddingBottom clears the stacked FABs, like <TabPage>.
  content: { paddingHorizontal: 12, paddingBottom: 160, gap: 16 },
});
