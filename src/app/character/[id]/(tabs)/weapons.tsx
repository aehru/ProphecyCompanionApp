import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import WeaponCard from '@/components/weapon-card';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { createWeapon, weaponsQuery } from '@/repositories/weapons';

export default function CharacterWeaponsScreen() {
  const numId = useCharacterId();
  const theme = useProphecyTheme();
  // Reload on focus so carac edits elsewhere keep the computed formulas correct.
  const { char } = useCharacterState(numId, { reloadOnFocus: true });
  const { data: weapons } = useLiveQuery(weaponsQuery(numId));

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const list = weapons ?? [];

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
        {list.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Aucune arme. Ajoutez-en une avec le bouton +.
          </Text>
        ) : (
          list.map((w) => (
            <WeaponCard key={w.id} weapon={w} caracValue={(k) => rec[k] ?? 0} />
          ))
        )}
      </KeyboardAwareScrollView>
      <AppFab icon="plus" label="Arme" onPress={() => createWeapon(numId)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 96 },
});
