import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import { EffectEditor } from '@/components/effects-card';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { effectQuery } from '@/repositories/effects';
import { skillsQuery } from '@/repositories/skills';

/**
 * Effect editor presented as a modal screen (over the character tabs), mirroring
 * the weapon editor. Loads the effect + the character's skills (offered as
 * targets). Edits persist live; the FAB closes.
 */
export default function EffectEditModal() {
  const { id, eid } = useLocalSearchParams<{ id: string; eid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(effectQuery(Number(eid)), [eid]);
  const { data: skills } = useLiveQuery(skillsQuery(Number(id)), [id]);
  const effect = data?.[0];

  return (
    <View style={styles.root}>
      {effect ? (
        <>
          <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
            <EffectEditor effect={effect} skills={skills ?? []} onClose={() => router.back()} />
          </KeyboardAwareScrollView>
          <AppFab icon={dsIcon('check')} onPress={() => router.back()} />
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Effet introuvable.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 12, paddingBottom: 160 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
