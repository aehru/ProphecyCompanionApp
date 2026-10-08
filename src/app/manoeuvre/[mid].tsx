import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import ManoeuvreEditor from '@/components/manoeuvre/manoeuvre-editor';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { customManoeuvreQuery } from '@/repositories/custom-manoeuvres';

/**
 * A « Maison » manœuvre's editor (modal). Device-wide, so it sits at the root
 * and not under a character: the Catalogues tab and a character's catalogue
 * both open it. It opens straight on the form — the reading is the catalogue
 * row it was opened from.
 */
export default function ManoeuvreModal() {
  const { mid } = useLocalSearchParams<{ mid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(customManoeuvreQuery(mid), [mid]);
  const row = data?.[0];

  if (!row) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Manœuvre introuvable.</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.container, contentWidth]}
      bottomOffset={24}>
      <ManoeuvreEditor manoeuvre={row} onClose={() => router.back()} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
