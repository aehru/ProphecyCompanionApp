import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import { TraitEditor } from '@/components/trait-card';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { traitQuery } from '@/repositories/traits';

/**
 * Avantage / désavantage editor, presented as a modal over the character tabs.
 * Edits persist live; the FAB closes. Mirrors the spell editor modal.
 */
export default function TraitEditModal() {
  const { tid } = useLocalSearchParams<{ id: string; tid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(traitQuery(Number(tid)), [tid]);
  const trait = data?.[0];

  return (
    <View style={styles.root}>
      {trait ? (
        <>
          <KeyboardAwareScrollView
            contentContainerStyle={[styles.container, contentWidth]}
            bottomOffset={24}>
            <TraitEditor trait={trait} onClose={() => router.back()} />
          </KeyboardAwareScrollView>
          <AppFab icon={dsIcon('check')} onPress={() => router.back()} />
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Entrée introuvable.</Text>
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
