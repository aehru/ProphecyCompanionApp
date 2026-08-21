import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';

import DiceRollerButton from '@/components/dice-roller-button';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

// The tabs header is the JS one from @react-navigation/elements, whose non-iOS
// default is 64 (getDefaultHeaderHeight) — 8dp taller than the native-stack
// toolbar (Android actionBarSize = 56) used by every other screen. Pin it to 56
// so headers are the same height across the app.
const HEADER_HEIGHT = 56;

export default function CharacterTabsLayout() {
  const theme = useProphecyTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      // Each tab is a complete page, not a step: a tab switch leaves no back
      // history, so system back (Android hardware key, iOS edge swipe) pops the
      // parent stack and leaves the character from any tab. The default
      // ('firstRoute') would rewind to Accueil first — an invisible extra press,
      // now that only Accueil shows an arrow.
      backBehavior="none"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        tabBarLabelStyle: { fontFamily: 'NotoSans_500Medium' },
        headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' },
        // `height` on the JS header is the total, status bar included.
        headerStyle: { height: HEADER_HEIGHT + insets.top },
        // The dice roller reaches every tab from here. The Fiche replaces this
        // with its own `setOptions` (sheet pencil) and re-adds the button there
        // — a screen-level headerRight overrides this one wholesale.
        headerRight: () => <DiceRollerButton />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarButtonTestID: 'tab-accueil',
          tabBarIcon: dsIcon('home'),
          // Only Accueil carries a back arrow: a tabs root gets none automatically,
          // and it is the one tab that is a way *in* to the character rather than a
          // page in its own right. From the first tab `back()` pops the parent
          // stack, so it returns wherever the character was opened from (the list,
          // or a campaign roster). The other tabs are self-contained — an arrow
          // there would rewind to Accueil first (Tabs default backBehavior), which
          // is not what it looks like it does.
          headerLeft: () => <IconButton icon="arrow-left" onPress={() => router.back()} />,
        }}
      />
      <Tabs.Screen
        name="fiche"
        options={{
          title: 'Fiche',
          tabBarIcon: dsIcon('scroll'),
          tabBarButtonTestID: 'tab-fiche',
        }}
      />
      <Tabs.Screen
        name="skills"
        options={{
          title: 'Compétences',
          tabBarIcon: dsIcon('book'),
          tabBarButtonTestID: 'tab-competences',
        }}
      />
      <Tabs.Screen
        name="weapons"
        options={{
          title: 'Inventaire',
          tabBarIcon: dsIcon('backpack'),
          tabBarButtonTestID: 'tab-inventaire',
        }}
      />
      <Tabs.Screen
        name="magic"
        options={{
          title: 'Magie',
          tabBarIcon: dsIcon('magic'),
          tabBarButtonTestID: 'tab-magie',
        }}
      />
    </Tabs>
  );
}
