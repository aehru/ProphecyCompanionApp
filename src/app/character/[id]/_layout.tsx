import { Stack } from 'expo-router';
import React from 'react';

/**
 * Per-character stack. The `(tabs)` group is the character sheet with a bottom
 * navbar (Résumé / Compétences / Armes) and draws its own header. Each tab flips
 * between a read view and a live edit mode in place — no separate status screen.
 * `weapon/[wid]` opens the weapon editor as a modal over the tabs.
 */
export default function CharacterLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="weapon/catalog"
        options={{
          presentation: 'modal',
          title: "Catalogue d'armes",
          headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' },
        }}
      />
      <Stack.Screen
        name="weapon/[wid]"
        options={{
          presentation: 'modal',
          title: "Modifier l'arme",
          headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' },
        }}
      />
    </Stack>
  );
}
