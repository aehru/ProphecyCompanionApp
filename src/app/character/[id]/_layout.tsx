import { Stack } from 'expo-router';
import React from 'react';

/**
 * Per-character stack. The `(tabs)` group is the character sheet with a bottom
 * navbar (Résumé / Compétences) and draws its own header. `status` is pushed on
 * top by the Statut FAB, so it keeps a back arrow and its own bottom tabs.
 */
export default function CharacterLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
