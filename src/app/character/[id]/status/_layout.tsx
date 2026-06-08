import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, Tabs, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useCharacterState } from '@/hooks/use-character-state';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { ActualState, Character } from '@/db/schema';
import { StatusContext } from '@/lib/status-context';
import { updateActualState } from '@/repositories/actual-state';
import { updateCharacter } from '@/repositories/characters';

const tabIcon =
  (name: string) =>
  ({ color, size }: { color: string; size: number }) =>
    <MaterialCommunityIcons name={name as never} color={color} size={size} />;

export default function StatusLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const theme = useProphecyTheme();
  const { char, state, setChar, setState } = useCharacterState(numId, { ensure: true });

  if (char === undefined || !state) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  if (char === null) {
    return (
      <View style={styles.centered}>
        <Text>Personnage introuvable.</Text>
      </View>
    );
  }

  const persistState = (patch: Partial<ActualState>) => {
    setState((p) => (p ? ({ ...p, ...patch } as ActualState) : p));
    updateActualState(numId, patch);
  };
  const persistChar = (patch: Partial<Character>) => {
    setChar((p) => (p ? ({ ...p, ...patch } as Character) : p));
    updateCharacter(numId, patch);
  };
  const setStateValue = (key: string, value: number) =>
    persistState({ [key]: value } as Partial<ActualState>);
  const setCharValue = (key: string, value: number) =>
    persistChar({ [key]: value } as Partial<Character>);

  return (
    <StatusContext.Provider
      value={{ char, state, persistState, persistChar, setStateValue, setCharValue }}>
      <Stack.Screen options={{ title: char.nom || 'Statut' }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: { backgroundColor: theme.colors.surface },
        }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Tendances', tabBarIcon: tabIcon('triangle-outline') }}
        />
        <Tabs.Screen
          name="blessures"
          options={{ title: 'Blessures', tabBarIcon: tabIcon('heart-pulse') }}
        />
        <Tabs.Screen
          name="ressources"
          options={{ title: 'Ressources', tabBarIcon: tabIcon('star-four-points') }}
        />
      </Tabs>
    </StatusContext.Provider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
