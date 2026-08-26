import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DiceRollerButton from '@/components/dice-roller-button';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

// Same pin as the character tabs: the JS header's non-iOS default is 64, 8dp
// taller than the native-stack toolbar every pushed screen uses.
const HEADER_HEIGHT = 56;

/**
 * The app's three top-level destinations. Everything a player opens FROM one of
 * them — a character, a campaign, a catalogue entry — is pushed on the root
 * stack ABOVE this navigator, so its own chrome takes the bar's place rather
 * than stacking a second one under it.
 *
 * `backBehavior` is left at its default here, unlike the character tabs: these
 * are the roots, and rewinding to Personnages before leaving the app is what a
 * bottom bar is expected to do.
 */
export default function RootTabsLayout() {
  const theme = useProphecyTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        tabBarLabelStyle: { fontFamily: 'NotoSans_500Medium' },
        headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' },
        // `height` on the JS header is the total, status bar included.
        headerStyle: { height: HEADER_HEIGHT + insets.top },
        // The dice roller reaches every tab from here. Personnages replaces this
        // with its own `setOptions` (import menu) and re-adds the button there —
        // a screen-level headerRight overrides this one wholesale.
        headerRight: () => <DiceRollerButton />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Personnages',
          tabBarButtonTestID: 'tab-personnages',
          tabBarIcon: dsIcon('character'),
        }}
      />
      <Tabs.Screen
        name="catalogs/index"
        options={{
          title: 'Catalogues',
          tabBarButtonTestID: 'tab-catalogues',
          tabBarIcon: dsIcon('book'),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Campagnes',
          tabBarButtonTestID: 'tab-campagnes',
          tabBarIcon: dsIcon('map'),
        }}
      />
    </Tabs>
  );
}
