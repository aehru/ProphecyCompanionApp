import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Cinzel_500Medium,
  Cinzel_600SemiBold,
  useFonts,
} from '@expo-google-fonts/cinzel';
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
} from '@expo-google-fonts/noto-sans';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DevSettings, StyleSheet, useColorScheme, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { PaperProvider, Text } from 'react-native-paper';

import CampaignLiveIndicator from '@/components/campaign-live-indicator';
import { backupDatabase, clearBackup, restoreDatabase } from '@/db/backup';
import { db, resetDatabase } from '@/db/client';
import { CampaignLiveProvider } from '@/hooks/use-campaign-live';
import { backfillCharacterUuids } from '@/repositories/characters';
import migrations from '../../drizzle/migrations';
import {
  ProphecyDarkTheme,
  ProphecyLightTheme,
  ProphecyNavigationDarkTheme,
  ProphecyNavigationLightTheme,
} from '@/theme/prophecyTheme';

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
  // Snapshot the DB before migrations touch it. This lazy state initializer runs
  // during render — i.e. before useMigrations' effect fires — so the backup is
  // always taken against the pre-migration file. Best-effort; never blocks.
  useState(backupDatabase);
  const { success, error } = useMigrations(db, migrations);
  const [fontsLoaded] = useFonts({
    Cinzel_500Medium,
    Cinzel_600SemiBold,
    NotoSans_400Regular,
    NotoSans_500Medium,
  });
  const [fatal, setFatal] = useState<string | null>(null);

  // On a failed/stale migration:
  //  - PROD: NEVER wipe — restore the pre-migration snapshot (preserving the
  //    user's characters) and surface the error.
  //  - DEV: auto-heal by deleting the DB and reloading, but only once (guard flag)
  //    so a genuinely broken migration shows the error instead of looping.
  useEffect(() => {
    if (!error) return;
    if (!__DEV__) {
      // Recover the pre-migration snapshot so a failed prod migration doesn't
      // leave a broken/half-migrated DB. The user's data is preserved for the
      // next launch (or a future retry/export flow) instead of being wiped.
      restoreDatabase();
      setFatal(error.message);
      return;
    }
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
    if (success) {
      // Migration went through — the pre-migration snapshot is no longer needed.
      clearBackup();
      AsyncStorage.removeItem(RESET_FLAG);
      // Fill portable uuids on characters that predate the column. Best-effort:
      // idempotent (NULL-only) and never blocks the UI.
      backfillCharacterUuids().catch(() => {});
    }
  }, [success]);

  if (fatal) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium">Erreur de base de données : {fatal}</Text>
      </View>
    );
  }

  if (!success || !fontsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardProvider>
      <PaperProvider theme={theme} settings={paperSettings}>
        <ThemeProvider
          value={colorScheme === 'dark' ? ProphecyNavigationDarkTheme : ProphecyNavigationLightTheme}>
          <CampaignLiveProvider>
            <View style={styles.root}>
              <Stack screenOptions={{ headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' } }}>
                <Stack.Screen name="index" options={{ title: 'Personnages' }} />
                <Stack.Screen
                  name="character/new"
                  options={{ title: 'Nouveau personnage', presentation: 'modal' }}
                />
                {/* [id] is a Tabs navigator (Résumé / Compétences) that draws its own header. */}
                <Stack.Screen name="character/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="campaigns/index" options={{ title: 'Campagnes' }} />
                {/* campaigns/[id] is a nested Stack (Salon / Compagnie) that draws its own headers. */}
                <Stack.Screen name="campaigns/[id]" options={{ headerShown: false }} />
              </Stack>
              {/* Floating overlay — shows on every screen while a campaign is live. */}
              <CampaignLiveIndicator />
            </View>
          </CampaignLiveProvider>
        </ThemeProvider>
      </PaperProvider>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  root: { flex: 1 },
});
