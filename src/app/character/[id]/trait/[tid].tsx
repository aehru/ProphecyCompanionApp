import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import { TraitEditor } from '@/components/trait-card';
import TraitDetail from '@/components/trait-detail';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { traitCostLabel } from '@/lib/trait-pool';
import { traitQuery } from '@/repositories/traits';

/**
 * One avantage / désavantage, as a modal over the character tabs: the entry as
 * it READS, with the FAB flipping to the editor.
 *
 * Read-first like every other card in the app (ArmorCard, ItemCard, SpellCard,
 * WeaponCard all open on a summary and flip on a pencil). It matters more here
 * than for gear: what a « Phobie 3 » actually does is a paragraph of rulebook
 * text, and opening straight into a form put it inside a cramped multiline
 * TextInput — the one shape in which nobody reads prose. {@link TraitDetail} is
 * the same body the catalogue shows, so what a player read before taking the
 * entry is what they read on their sheet afterwards.
 *
 * Edits persist live (debounced); the FAB's check goes back to the reading.
 */
export default function TraitModal() {
  const { tid } = useLocalSearchParams<{ id: string; tid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const [editing, setEditing] = useState(false);
  const { data } = useLiveQuery(traitQuery(Number(tid)), [tid]);
  const trait = data?.[0];

  if (!trait) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Entrée introuvable.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.container, contentWidth]}
        bottomOffset={24}>
        {editing ? (
          // Closing the editor returns to the reading rather than to the sheet:
          // the row was opened to be looked at, and an edit is a detour.
          <TraitEditor
            trait={trait}
            onClose={() => setEditing(false)}
            onDeleted={() => router.back()}
          />
        ) : (
          <>
            <Text variant="headlineSmall" style={styles.name}>
              {trait.name || 'Sans nom'}
            </Text>
            <TraitDetail
              kind={trait.kind}
              rarity={trait.rarity}
              cost={traitCostLabel([trait.cost])}
              description={trait.description}
              inGameEffect={trait.inGameEffect}
              evolving={trait.evolving}
              note={trait.note}
            />
          </>
        )}
      </KeyboardAwareScrollView>
      <AppFab icon={dsIcon(editing ? 'check' : 'edit')} onPress={() => setEditing((e) => !e)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 12, paddingBottom: 160 },
  name: { fontFamily: 'Cinzel_600SemiBold' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
