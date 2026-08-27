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
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { PaperProvider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CampaignLiveIndicator from '@/components/campaign-live-indicator';
import DatabaseGate from '@/components/database-gate';
import DiceRollerButton from '@/components/dice-roller-button';
import LogErrorBoundary from '@/components/log-error-boundary';
import AlertHost from '@/components/ui/alert-host';
import { CampaignLiveProvider } from '@/hooks/use-campaign-live';
import { DiceRollerProvider } from '@/hooks/use-dice-roller';
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

// The same 56 the two Tabs navigators pin, for the same reason — but this stack
// needs it on WEB only. There, expo-router's Stack falls back to the JS header,
// whose non-iOS default is 64 (elements/Header/getDefaultHeaderHeight), so every
// pushed screen — Diagnostic, Confidentialité, À propos — stood 8dp taller than
// the tab screen it came from. Native needs nothing: its toolbar is already 56
// (Android actionBarSize) / 44 (iOS).
const HEADER_HEIGHT = 56;

/**
 * `height` is absent from native-stack's `headerStyle` type on purpose — a
 * native toolbar's height belongs to the OS, which is why only `backgroundColor`
 * is read there. The JS header the web build falls back to *does* read it. The
 * cast is that seam between the two implementations, and the Platform gate keeps
 * a prop that means nothing on native from being sent there at all.
 */
const webHeaderStyle = (topInset: number) =>
  Platform.OS === 'web'
    ? ({ height: HEADER_HEIGHT + topInset } as { backgroundColor?: never })
    : undefined;

// react-native-paper resolves its default icons through @expo/vector-icons.
const paperSettings = {
  icon: ({ name, color, size }: { name: string; color?: string; size: number }) => (
    <MaterialCommunityIcons name={name as never} color={color} size={size} />
  ),
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? ProphecyDarkTheme : ProphecyLightTheme;
  // Safe above the Stack: expo-router's own root mounts <SafeAreaProvider>.
  const insets = useSafeAreaInsets();
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
        {/* Above the gate on purpose: an alert raised by the database failure
            screen has to be able to show. Paper's Portal hoists it to the top
            regardless of where it sits here. */}
        <AlertHost />
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
                {/* Above the Stack: the roller opens from any screen's header and
                    its dialog outlives navigation (see use-dice-roller). */}
                <DiceRollerProvider>
                  <View style={styles.root}>
                    <Stack
                      screenOptions={{
                        headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' },
                        // `height` on the JS header is the total, status bar included.
                        headerStyle: webHeaderStyle(insets.top),
                        // Every screen in this stack carries the dice button; the
                        // nested navigators below set their own (they draw their
                        // own headers), and the two settings screens opt out.
                        headerRight: () => <DiceRollerButton />,
                      }}>
                      {/* (root) is the bottom-tab navigator — Personnages, Catalogues,
                          Campagnes — and draws its own headers. Everything below is
                          pushed ON TOP of it, which is what puts a character's or a
                          campaign's own chrome in the tab bar's place. */}
                      <Stack.Screen name="(root)" options={{ headerShown: false }} />
                      <Stack.Screen
                        name="character/new"
                        options={{ title: 'Nouveau personnage', presentation: 'modal' }}
                      />
                      {/* [id] is a Tabs navigator (Résumé / Compétences) that draws its own header. */}
                      <Stack.Screen name="character/[id]" options={{ headerShown: false }} />
                      {/* campaigns/[id] is a nested Stack (Salon / Compagnie) that draws its own headers. */}
                      <Stack.Screen name="campaigns/[id]" options={{ headerShown: false }} />
                      {/* No dice on the two settings screens: nothing there is played. */}
                      <Stack.Screen
                        name="diagnostics"
                        options={{ title: 'Diagnostic', headerRight: undefined }}
                      />
                      <Stack.Screen
                        name="privacy"
                        options={{ title: 'Confidentialité', headerRight: undefined }}
                      />
                      <Stack.Screen
                        name="about"
                        options={{ title: 'À propos', headerRight: undefined }}
                      />
                    </Stack>
                    {/* Floating overlay — shows on every screen while a campaign is live. */}
                    <CampaignLiveIndicator />
                    <RouteBreadcrumbs />
                  </View>
                </DiceRollerProvider>
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
