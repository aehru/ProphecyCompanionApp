import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { IconButton } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function CharacterTabsLayout() {
  const theme = useProphecyTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        tabBarLabelStyle: { fontFamily: 'NotoSans_500Medium' },
        headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' },
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
        options={{ title: 'Armes', tabBarIcon: dsIcon('sword') }}
      />
      <Tabs.Screen
        name="magic"
        options={{ title: 'Magie', tabBarIcon: dsIcon('magic') }}
      />
    </Tabs>
  );
}
