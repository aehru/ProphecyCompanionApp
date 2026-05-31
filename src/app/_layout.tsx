import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DevSettings, StyleSheet, useColorScheme, View } from 'react-native';
import { PaperProvider, Text } from 'react-native-paper';

import { db, resetDatabase } from '@/db/client';
import migrations from '../../drizzle/migrations';
import { ProphecyDarkTheme, ProphecyLightTheme } from './prophecyTheme';

const RESET_FLAG = 'db_reset_attempted';

// react-native-paper resolves its default icons through @expo/vector-icons.
const paperSettings = {
  icon: ({ name, color, size }: { name: string; color?: string; size: number }) => (
    <MaterialCommunityIcons name={name as never} color={color} size={size} />
  ),
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? ProphecyDarkTheme : ProphecyLightTheme;
  const { success, error } = useMigrations(db, migrations);
  const [fatal, setFatal] = useState<string | null>(null);

  // Auto-heal a failed/stale migration: delete the DB and reload — but only once
  // (guard flag) so a genuinely broken migration shows the error instead of looping.
  useEffect(() => {
    if (!error) return;
    let cancelled = false;
    (async () => {
      const tried = await AsyncStorage.getItem(RESET_FLAG);
      if (tried) {
        if (!cancelled) setFatal(error.message);
        return;
      }
      await AsyncStorage.setItem(RESET_FLAG, '1');
      resetDatabase();
      DevSettings.reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [error]);

  useEffect(() => {
    if (success) AsyncStorage.removeItem(RESET_FLAG);
  }, [success]);

  if (fatal) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium">Erreur de base de données : {fatal}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme} settings={paperSettings}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Personnages' }} />
          <Stack.Screen
            name="character/new"
            options={{ title: 'Nouveau personnage', presentation: 'modal' }}
          />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
