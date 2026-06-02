import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, Tabs, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import type { ActualState, Character } from '@/db/schema';
import { StatusContext } from '@/lib/status-context';
import { ensureActualState, updateActualState } from '@/repositories/actual-state';
import { getCharacter, updateCharacter } from '@/repositories/characters';

const tabIcon =
  (name: string) =>
  ({ color, size }: { color: string; size: number }) =>
    <MaterialCommunityIcons name={name as never} color={color} size={size} />;

export default function StatusLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const theme = useTheme();
  const [char, setChar] = useState<Character | null | undefined>(undefined);
  const [state, setState] = useState<ActualState | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const c = await getCharacter(numId);
      const s = await ensureActualState(numId);
      if (active) {
        setChar(c);
        setState(s);
      }
    })();
    return () => {
      active = false;
    };
  }, [numId]);

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

  return (
    <StatusContext.Provider value={{ char, state, persistState, persistChar }}>
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
