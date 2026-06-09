import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { Character } from '@/db/schema';

/**
 * Shared loading/not-found guard for character screens. Returns a fallback
 * element while loading or when the character is missing, or `null` once it's
 * safe to render. Pass `ready` for extra required data (e.g. the state row).
 *
 * Usage: `const fb = characterFallback(char); if (fb) return fb;`
 */
export function characterFallback(
  char: Character | null | undefined,
  ready = true,
): React.ReactElement | null {
  if (char === undefined || !ready) {
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
  return null;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
