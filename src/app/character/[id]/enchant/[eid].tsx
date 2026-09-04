import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import EnchantEditor from '@/components/enchant-editor';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { armorQuery } from '@/repositories/armor';
import { enchantQuery } from '@/repositories/enchants';
import { itemsQuery } from '@/repositories/items';
import { shieldsQuery } from '@/repositories/shields';
import { spellsQuery } from '@/repositories/spells';
import { weaponsQuery } from '@/repositories/weapons';

/**
 * Enchant editor presented as a modal screen (over the character tabs),
 * mirroring the weapon/effect editors — the form (target kind + target object
 * + optional linked spell + name/effect/uses) runs long enough that a dialog
 * doesn't fit. Edits persist live; the FAB closes.
 */
export default function EnchantEditModal() {
  const { id, eid } = useLocalSearchParams<{ id: string; eid: string }>();
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(enchantQuery(Number(eid)), [eid]);
  const { data: weapons } = useLiveQuery(weaponsQuery(Number(id)), [id]);
  const { data: armor } = useLiveQuery(armorQuery(Number(id)), [id]);
  const { data: shields } = useLiveQuery(shieldsQuery(Number(id)), [id]);
  const { data: items } = useLiveQuery(itemsQuery(Number(id)), [id]);
  const { data: spells } = useLiveQuery(spellsQuery(Number(id)), [id]);
  const enchant = data?.[0];

  return (
    <View style={styles.root}>
      {enchant ? (
        <>
          <KeyboardAwareScrollView contentContainerStyle={[styles.container, contentWidth]} bottomOffset={24}>
            <EnchantEditor
              enchant={enchant}
              lists={{
                weapons: weapons ?? [],
                armor: armor ?? [],
                shields: shields ?? [],
                items: items ?? [],
              }}
              spells={spells ?? []}
              onPickFromCatalog={() => router.push(`/character/${id}/enchant/catalog?eid=${eid}`)}
              onClose={() => router.back()}
            />
          </KeyboardAwareScrollView>
          <AppFab icon={dsIcon('check')} onPress={() => router.back()} />
        </>
      ) : (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Enchantement introuvable.</Text>
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
