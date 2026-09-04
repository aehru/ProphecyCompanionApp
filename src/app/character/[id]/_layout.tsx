import { Stack } from 'expo-router';
import React from 'react';

import DiceRollerButton from '@/components/dice-roller-button';

/**
 * Per-character stack. The `(tabs)` group is the character sheet with a bottom
 * navbar (Résumé / Compétences / Armes) and draws its own header. Each tab flips
 * between a read view and a live edit mode in place — no separate status screen.
 * `weapon/[wid]` opens the weapon editor as a modal over the tabs.
 */
export default function CharacterLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' },
        // Modal editors and catalogues get the dice roller too — a damage
        // formula is read here as often as anywhere else.
        headerRight: () => <DiceRollerButton />,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="weapon/catalog"
        options={{
          presentation: 'modal',
          title: "Catalogue d'armes",
        }}
      />
      <Stack.Screen
        name="weapon/[wid]"
        options={{
          presentation: 'modal',
          title: "Modifier l'arme",
        }}
      />
      <Stack.Screen
        name="armor/catalog"
        options={{
          presentation: 'modal',
          title: "Catalogue d'armures",
        }}
      />
      <Stack.Screen
        name="armor/[aid]"
        options={{
          presentation: 'modal',
          title: "Modifier l'armure",
        }}
      />
      <Stack.Screen
        name="shield/catalog"
        options={{
          presentation: 'modal',
          title: 'Catalogue de boucliers',
        }}
      />
      <Stack.Screen
        name="shield/[sid]"
        options={{
          presentation: 'modal',
          title: 'Modifier le bouclier',
        }}
      />
      <Stack.Screen
        name="spell/catalog"
        options={{
          presentation: 'modal',
          title: 'Catalogue de sorts',
        }}
      />
      <Stack.Screen
        name="spell/[sid]"
        options={{
          presentation: 'modal',
          title: 'Modifier le sortilège',
        }}
      />
      <Stack.Screen
        name="trait/catalog"
        options={{
          presentation: 'modal',
          title: 'Avantages et désavantages',
        }}
      />
      <Stack.Screen
        name="trait/[tid]"
        options={{
          presentation: 'modal',
          title: "Modifier l'entrée",
        }}
      />
      <Stack.Screen
        name="enchant/[eid]"
        options={{
          presentation: 'modal',
          title: "Modifier l'enchantement",
        }}
      />
      <Stack.Screen
        name="enchant/catalog"
        options={{
          presentation: 'modal',
          title: 'Sort de l’enchantement',
        }}
      />
    </Stack>
  );
}
