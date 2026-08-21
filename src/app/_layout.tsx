import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// Import each weight through its own subpath, NEVER the package root: the root
// index re-`require`s every .ttf in the family, so Metro bundles all 18 NotoSans
// weights (5.3 MB) to use two. Same trap on `@expo/vector-icons`, whose index
// pulls all 16 icon fonts. Keep these imports deep.
import { Cinzel_500Medium } from '@expo-google-fonts/cinzel/500Medium';
import { Cinzel_600SemiBold } from '@expo-google-fonts/cinzel/600SemiBold';
import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_500Medium } from '@expo-google-fonts/noto-sans/500Medium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DevSettings, StyleSheet, useColorScheme, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { PaperProvider, Text } from 'react-native-paper';

import CampaignLiveIndicator from '@/components/campaign-live-indicator';
import LogErrorBoundary from '@/components/log-error-boundary';
import { clearBackup, restoreDatabase } from '@/db/backup';
import { closeConnection, db, resetDatabase } from '@/db/client';
import { useMigrations } from '@/db/use-migrations';
import { CampaignLiveProvider } from '@/hooks/use-campaign-live';
import { useRouteBreadcrumbs } from '@/hooks/use-route-breadcrumbs';
import { describeError } from '@/lib/error-chain';
import { initDiagnostics, log } from '@/lib/log';
import { installCapture } from '@/lib/log/capture';
import { backfillCharacterUuids } from '@/repositories/characters';
import migrations from '../../drizzle/migrations';
import {
  ProphecyDarkTheme,
  ProphecyLightTheme,
  ProphecyNavigationDarkTheme,
  ProphecyNavigationLightTheme,
} from '@/theme/prophecyTheme';

const RESET_FLAG = 'db_reset_attempted';

/** Emits a `route.change` breadcrumb. Null render — it only needs the router. */
function RouteBreadcrumbs() {
  useRouteBreadcrumbs();
  return null;
}

// Diagnostics come up at import time, before anything renders: a crash during
// the very first render (or inside a migration) has to land in the log too.
// Both calls are best-effort and never throw.
installCapture();
void initDiagnostics();

// react-native-paper resolves its default icons through @expo/vector-icons.
const paperSettings = {
  icon: ({ name, color, size }: { name: string; color?: string; size: number }) => (
    <MaterialCommunityIcons name={name as never} color={color} size={size} />
  ),
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? ProphecyDarkTheme : ProphecyLightTheme;
  // The pre-migration snapshot is taken inside the connection's own open promise
  // (see db/client), so it is guaranteed to precede the first query migrations
  // issue — no ordering to arrange here.
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
    log.error('db.migrate.failed', error, { phase: __DEV__ ? 'dev' : 'prod' });
    let cancelled = false;
    (async () => {
      if (!__DEV__) {
        // Recover the pre-migration snapshot so a failed prod migration doesn't
        // leave a broken/half-migrated DB. The user's data is preserved for the
        // next launch (or a future retry/export flow) instead of being wiped.
        // The connection must be closed before the file is swapped underneath it.
        await closeConnection();
        const restored = restoreDatabase();
        log.warn('db.restore', { restored });
        if (!cancelled) setFatal(describeError(error));
        return;
      }
      const tried = await AsyncStorage.getItem(RESET_FLAG);
      if (tried) {
        if (!cancelled) setFatal(describeError(error));
        return;
      }
      await AsyncStorage.setItem(RESET_FLAG, '1');
      log.warn('db.reset', { reason: 'migration-failed' });
      await resetDatabase();
      DevSettings.reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [error]);

  useEffect(() => {
    if (success) {
      log.info('db.migrate.ok');
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
            {/* Catches render-time throws the global handler never sees, and puts
                the stack in the diagnostic log instead of a blank screen. */}
            <LogErrorBoundary>
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
                  <Stack.Screen name="npc/generate" options={{ title: 'Générer un PNJ' }} />
                  <Stack.Screen name="diagnostics" options={{ title: 'Diagnostic' }} />
                  <Stack.Screen name="privacy" options={{ title: 'Confidentialité' }} />
                </Stack>
                {/* Floating overlay — shows on every screen while a campaign is live. */}
                <CampaignLiveIndicator />
                <RouteBreadcrumbs />
              </View>
            </LogErrorBoundary>
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
