import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { IconButton } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

const tabIcon =
  (name: string) =>
  ({ color, size }: { color: string; size: number }) =>
    <MaterialCommunityIcons name={name as never} color={color} size={size} />;

export default function CharacterTabsLayout() {
  const theme = useProphecyTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        // No automatic back arrow at a tabs root — add one to return to the list.
        headerLeft: () => <IconButton icon="arrow-left" onPress={() => router.back()} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Résumé', tabBarIcon: tabIcon('account-details') }}
      />
      <Tabs.Screen
        name="skills"
        options={{ title: 'Compétences', tabBarIcon: tabIcon('sword-cross') }}
      />
    </Tabs>
  );
}
