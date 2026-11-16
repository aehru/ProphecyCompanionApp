import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import FavorEditor from '@/components/favor/favor-editor';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { customFavorQuery } from '@/repositories/custom-favors';

/**
 * A « Maison » Faveur's editor (modal). Device-wide like `manoeuvre/[mid]`, so
 * it sits at the root: the Catalogues tab and an Élu's catalogue both open it.
 */
export default function FavorModal() {
  const { fid } = useLocalSearchParams<{ fid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(customFavorQuery(fid), [fid]);
  const row = data?.[0];

  if (!row) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Faveur introuvable.</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.container, contentWidth]}
      bottomOffset={24}>
      <FavorEditor favor={row} onClose={() => router.back()} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
