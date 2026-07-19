import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import { SpellEditor } from '@/components/spell-card';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { spellQuery } from '@/repositories/spells';

/**
 * Spell editor presented as a modal screen (over the character tabs). Full
 * screen — the shared KeyboardAwareScrollView handles the keyboard like every
 * other screen. Edits persist live; the FAB saves (closes). Mirrors the weapon
 * editor modal.
 */
export default function SpellEditModal() {
  const { sid } = useLocalSearchParams<{ id: string; sid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(spellQuery(Number(sid)), [sid]);
  const spell = data?.[0];

  return (
    <View style={styles.root}>
      {spell ? (
        <>
          <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
            <SpellEditor spell={spell} onClose={() => router.back()} />
          </KeyboardAwareScrollView>
          <AppFab icon={dsIcon('check')} onPress={() => router.back()} />
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Sortilège introuvable.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 12, paddingBottom: 160 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
