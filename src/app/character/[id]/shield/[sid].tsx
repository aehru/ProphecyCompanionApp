import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import ShieldEditor from '@/components/shield-editor';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { shieldQuery } from '@/repositories/shields';

/**
 * Shield editor presented as a modal screen (over the character tabs). Mirrors
 * the weapon editor modal.
 */
export default function ShieldEditModal() {
  const { sid } = useLocalSearchParams<{ id: string; sid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(shieldQuery(Number(sid)), [sid]);
  const shield = data?.[0];

  return (
    <View style={styles.root}>
      {shield ? (
        <>
          <KeyboardAwareScrollView contentContainerStyle={[styles.container, contentWidth]} bottomOffset={24}>
            <ShieldEditor shield={shield} onClose={() => router.back()} />
          </KeyboardAwareScrollView>
          <AppFab icon={dsIcon('check')} onPress={() => router.back()} />
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Bouclier introuvable.</Text>
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
