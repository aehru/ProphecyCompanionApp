import { Stack } from 'expo-router';
import React from 'react';

/**
 * Per-character stack. The `(tabs)` group is the character sheet with a bottom
 * navbar (Résumé / Compétences / Armes) and draws its own header. Each tab flips
 * between a read view and a live edit mode in place — no separate status screen.
 */
export default function CharacterLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
