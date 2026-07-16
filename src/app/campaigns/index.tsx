import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, List, Portal, Text, TextInput } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  campaignsListQuery,
  createCampaign,
  deleteCampaign,
  joinCampaign,
} from '@/repositories/campaigns';

type DialogKind = 'create' | 'join' | null;

export default function CampaignsScreen() {
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(campaignsListQuery());
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const campaigns = data ?? [];
  // Prefill the server field with the last one used — groups stick to one server.
  const openDialog = (kind: DialogKind) => {
    if (!serverUrl && campaigns.length > 0) setServerUrl(campaigns[campaigns.length - 1].serverUrl);
    setDialog(kind);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const row =
        dialog === 'create'
          ? await createCampaign(name.trim(), serverUrl.trim())
          : await joinCampaign(code, serverUrl.trim());
      setDialog(null);
      setName('');
      setCode('');
      router.push(`/campaigns/${row.id}` as Href);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Connexion au serveur impossible.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (id: number, role: string) => {
    Alert.alert(
      role === 'gm' ? 'Supprimer la campagne ?' : 'Quitter la campagne ?',
      role === 'gm'
        ? 'La campagne et toutes les fiches partagées seront effacées du serveur.'
        : 'Vos notes locales pour cette campagne seront effacées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: () => deleteCampaign(id) },
      ],
    );
  };

  const canSubmit =
    serverUrl.trim().length > 0 &&
    (dialog === 'create' ? name.trim().length > 0 : code.trim().length >= 4);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.actions}>
        <Button mode="contained" icon="plus" onPress={() => openDialog('create')}>
          Créer une campagne
        </Button>
        <Button mode="outlined" icon="location-enter" onPress={() => openDialog('join')}>
          Rejoindre avec un code
        </Button>
      </View>

      {campaigns.length === 0 ? (
        <View
          style={[
            styles.empty,
            {
              backgroundColor: theme.prophecy.surfaceContainerLow,
              borderColor: theme.colors.outlineVariant,
            },
          ]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Aucune campagne
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Le MJ crée la campagne et partage son code avec les joueurs.
          </Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
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
              title={item.name}
              description={`${item.role === 'gm' ? 'MJ' : 'Joueur'} · ${item.code}`}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={(p) => (
                <List.Icon {...p} icon={item.role === 'gm' ? 'crown' : 'account-group'} />
              )}
              right={(p) => (
                <IconButton
                  {...p}
                  icon="delete-outline"
                  onPress={() => confirmDelete(item.id, item.role)}
                />
              )}
              onPress={() => router.push(`/campaigns/${item.id}` as Href)}
            />
          )}
        />
      )}

      <Portal>
        <Dialog visible={dialog !== null} onDismiss={() => setDialog(null)}>
          <Dialog.Title>
            {dialog === 'create' ? 'Nouvelle campagne' : 'Rejoindre une campagne'}
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {dialog === 'create' ? (
              <TextInput label="Nom de la campagne" value={name} onChangeText={setName} />
            ) : (
              <TextInput
                label="Code de la campagne"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            )}
            <TextInput
              label="Serveur"
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="wss://exemple.org ou 192.168.1.10:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {dialog === 'join' ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Les données que vous choisirez de partager ensuite (nom, état de combat,
                caractéristiques) seront stockées sur ce serveur, sous la responsabilité de la
                personne qui l’héberge. Cessez le partage ou quittez la campagne pour les effacer.
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(null)}>Annuler</Button>
            <Button onPress={submit} disabled={!canSubmit || busy} loading={busy}>
              {dialog === 'create' ? 'Créer' : 'Rejoindre'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8, padding: 16, flexWrap: 'wrap' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  item: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  empty: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 4,
  },
  dialogContent: { gap: 12 },
});
