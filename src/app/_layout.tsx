import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { PaperProvider, Text } from 'react-native-paper';
import { ProphecyDarkTheme, ProphecyLightTheme } from './prophecyTheme';

import { db } from '@/db/client';
import migrations from '../../drizzle/migrations';

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

  if (error) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium">Erreur de base de données : {error.message}</Text>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
