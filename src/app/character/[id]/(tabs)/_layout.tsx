import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';

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
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        tabBarLabelStyle: { fontFamily: 'NotoSans_500Medium' },
        headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' },
        // `height` on the JS header is the total, status bar included.
        headerStyle: { height: HEADER_HEIGHT + insets.top },
        // No automatic back arrow at a tabs root — add one to return to the list.
        headerLeft: () => <IconButton icon="arrow-left" onPress={() => router.back()} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Accueil', tabBarIcon: dsIcon('home') }}
      />
      <Tabs.Screen
        name="fiche"
        options={{ title: 'Fiche', tabBarIcon: dsIcon('scroll') }}
      />
      <Tabs.Screen
        name="skills"
        options={{ title: 'Compétences', tabBarIcon: dsIcon('book') }}
      />
      <Tabs.Screen
        name="weapons"
        options={{ title: 'Inventaire', tabBarIcon: dsIcon('backpack') }}
      />
      <Tabs.Screen
        name="magic"
        options={{ title: 'Magie', tabBarIcon: dsIcon('magic') }}
      />
    </Tabs>
  );
}
