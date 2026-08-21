import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// Import each weight through its own subpath, NEVER the package root: the root
// index re-`require`s every .ttf in the family, so Metro bundles all 18 NotoSans
// weights (5.3 MB) to use two. Same trap on `@expo/vector-icons`, whose index
// pulls all 16 icon fonts. Keep these imports deep.
import { Cinzel_500Medium } from '@expo-google-fonts/cinzel/500Medium';
import { Cinzel_600SemiBold } from '@expo-google-fonts/cinzel/600SemiBold';
import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_500Medium } from '@expo-google-fonts/noto-sans/500Medium';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { PaperProvider } from 'react-native-paper';

import CampaignLiveIndicator from '@/components/campaign-live-indicator';
import DatabaseGate from '@/components/database-gate';
import LogErrorBoundary from '@/components/log-error-boundary';
import { CampaignLiveProvider } from '@/hooks/use-campaign-live';
import { useRouteBreadcrumbs } from '@/hooks/use-route-breadcrumbs';
import { initDiagnostics } from '@/lib/log';
import { installCapture } from '@/lib/log/capture';
import {
  ProphecyDarkTheme,
  ProphecyLightTheme,
  ProphecyNavigationDarkTheme,
  ProphecyNavigationLightTheme,
} from '@/theme/prophecyTheme';

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
  const [fontsLoaded] = useFonts({
    Cinzel_500Medium,
    Cinzel_600SemiBold,
    NotoSans_400Regular,
    NotoSans_500Medium,
  });
  // Bumping this remounts <DatabaseGate>, which is the whole of « Réessayer »:
  // Drizzle's `useMigrations` runs once per mount and has no retry of its own.
  const [attempt, setAttempt] = useState(0);

  // The providers sit ABOVE the gate so its failure screen is themed too — that
  // screen is the one a user is most likely to photograph for a bug report.
  return (
    <KeyboardProvider>
      <PaperProvider theme={theme} settings={paperSettings}>
        <ThemeProvider
          value={colorScheme === 'dark' ? ProphecyNavigationDarkTheme : ProphecyNavigationLightTheme}>
          <DatabaseGate
            key={attempt}
            fontsLoaded={fontsLoaded}
            onRetry={() => setAttempt((n) => n + 1)}>
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
                    <Stack.Screen name="diagnostics" options={{ title: 'Diagnostic' }} />
                    <Stack.Screen name="privacy" options={{ title: 'Confidentialité' }} />
                  </Stack>
                  {/* Floating overlay — shows on every screen while a campaign is live. */}
                  <CampaignLiveIndicator />
                  <RouteBreadcrumbs />
                </View>
              </LogErrorBoundary>
            </CampaignLiveProvider>
          </DatabaseGate>
        </ThemeProvider>
      </PaperProvider>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
