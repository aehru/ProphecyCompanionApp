import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import WeaponEditor from '@/components/weapon-editor';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { weaponQuery } from '@/repositories/weapons';

/**
 * Weapon editor presented as a modal screen (over the character tabs). A full
 * screen — so the shared KeyboardAwareScrollView handles the keyboard the same
 * way every other screen does. Edits persist live; the FAB saves (closes).
 */
export default function WeaponEditModal() {
  const { wid } = useLocalSearchParams<{ id: string; wid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(weaponQuery(Number(wid)), [wid]);
  const weapon = data?.[0];

  return (
    <View style={styles.root}>
      {weapon ? (
        <>
          <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
            <WeaponEditor weapon={weapon} onClose={() => router.back()} />
          </KeyboardAwareScrollView>
          <AppFab icon={dsIcon('check')} onPress={() => router.back()} />
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Arme introuvable.</Text>
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
