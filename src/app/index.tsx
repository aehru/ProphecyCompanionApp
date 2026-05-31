import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, List, Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { charactersListQuery } from '@/repositories/characters';

export default function CharactersListScreen() {
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(charactersListQuery());

  const isEmpty = !data || data.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isEmpty ? (
        <View
          style={[
            styles.empty,
            {
              backgroundColor: theme.prophecy.surfaceContainerLow,
              borderColor: theme.colors.outlineVariant,
            },
          ]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Aucun personnage
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Touchez + pour en creer un.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <List.Item
              style={[
                styles.item,
                {
                  backgroundColor: theme.prophecy.surfaceContainerLow,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              title={item.nom || 'Sans nom'}
              description={item.concept || undefined}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={(p) => <List.Icon {...p} icon="account" />}
              onPress={() => router.push(`/character/${item.id}` as Href)}
            />
          )}
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/character/new')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 96 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    padding: 24,
    borderWidth: 1,
    borderRadius: 20,
  },
  item: {
    borderWidth: 1,
    borderRadius: 16,
  },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
