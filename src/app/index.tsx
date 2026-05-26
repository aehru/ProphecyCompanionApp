import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, List, Text } from 'react-native-paper';

import { charactersListQuery } from '@/repositories/characters';

export default function CharactersListScreen() {
  const router = useRouter();
  const { data } = useLiveQuery(charactersListQuery());

  const isEmpty = !data || data.length === 0;

  return (
    <View style={styles.container}>
      {isEmpty ? (
        <View style={styles.empty}>
          <Text variant="titleMedium">Aucun personnage</Text>
          <Text variant="bodyMedium">Touchez + pour en créer un.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <List.Item
              title={item.nom || 'Sans nom'}
              description={item.concept || undefined}
              left={(p) => <List.Icon {...p} icon="account" />}
              onPress={() => router.push(`/character/${item.id}` as Href)}
            />
          )}
        />
      )}
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/character/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
