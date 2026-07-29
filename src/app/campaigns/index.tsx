import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, List, Portal, Text, TextInput } from 'react-native-paper';

import { QrScannerModal } from '@/components/campaign/qr-scanner';
import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
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
  const [scanning, setScanning] = useState(false);

  const campaigns = data ?? [];
  // Abort handle for the in-flight create; "Annuler" cancels the request too.
  const abortRef = useRef<AbortController | null>(null);

  // Deep link from the GM's QR code (prophecyapp://campaigns?code=..&server=..):
  // prefill and open the join dialog. Runs once per param arrival.
  const params = useLocalSearchParams<{ code?: string; server?: string }>();
  useEffect(() => {
    if (params.code && params.server) {
      setCode(params.code);
      setServerUrl(params.server);
      setDialog('join');
    }
  }, [params.code, params.server]);
  // Prefill the server field with the last one used — groups stick to one server.
  const openDialog = (kind: DialogKind) => {
    if (!serverUrl && campaigns.length > 0) setServerUrl(campaigns[campaigns.length - 1].serverUrl);
    setDialog(kind);
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setDialog(null);
    setBusy(false);
  };

  const submit = async () => {
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const row =
        dialog === 'create'
          ? await createCampaign(name.trim(), serverUrl.trim(), controller.signal)
          : await joinCampaign(code, serverUrl.trim());
      setDialog(null);
      setName('');
      setCode('');
      router.push(`/campaigns/${row.id}` as Href);
    } catch (e) {
      // User pressed Annuler: the dialog is already closed — stay silent.
      if (!controller.signal.aborted) {
        Alert.alert('Erreur', e instanceof Error ? e.message : 'Connexion au serveur impossible.');
      }
    } finally {
      abortRef.current = null;
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
        <Button mode="outlined" icon="location-enter" onPress={() => openDialog('join')}>
          Rejoindre avec un code
        </Button>
      </View>

      {/* One notice for everyone (GM included). The join dialog repeats a short
          version, since a QR/deep-link join opens straight onto it. */}
      <View
        style={[
          styles.disclaimer,
          {
            backgroundColor: theme.prophecy.surfaceContainerLow,
            borderColor: theme.colors.outlineVariant,
          },
        ]}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Mode campagne. Lorsqu’un joueur partage un personnage, un extrait (nom, état de combat,
          caractéristiques) est envoyé au serveur choisi et conservé sous la responsabilité de son
          hébergeur — instance communautaire ou auto-hébergée. En tant que MJ, c’est vous qui
          choisissez ce serveur. Arrêter le partage ou quitter la campagne en demande l’effacement.
        </Text>
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
          contentContainerStyle={[styles.listContent, contentWidth]}
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
        <Dialog
          visible={dialog !== null}
          onDismiss={cancel}
          style={[styles.dialog, { borderColor: theme.prophecy.border }]}>
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
              placeholder="exemple.fr ou 192.168.1.10:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {dialog === 'join' ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Les données que vous choisirez de partager ensuite (nom, état de combat,
                caractéristiques) seront stockées sur ce serveur, sous la responsabilité de la
                personne qui l’héberge. Cessez le partage ou quittez la campagne pour en demander
                l’effacement.
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={cancel}>Annuler</Button>
            <Button
              mode="contained"
              icon={dialog === 'create' ? 'plus' : 'location-enter'}
              onPress={submit}
              disabled={!canSubmit || busy}
              loading={busy}>
              {dialog === 'create' ? 'Créer' : 'Rejoindre'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Same landing as the OS-camera deep link: prefill + open the join
          dialog so the consent line is always seen before joining. */}
      <QrScannerModal
        visible={scanning}
        onClose={() => setScanning(false)}
        onScan={({ code: scannedCode, server }) => {
          setScanning(false);
          setCode(scannedCode);
          setServerUrl(server);
          setDialog('join');
        }}
      />

      <AppFab icon="qrcode-scan" onPress={() => setScanning(true)} offset={72} />
      <AppFab icon={dsIcon('plus')} label="Créer" onPress={() => openDialog('create')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8, padding: 16, flexWrap: 'wrap' },
  disclaimer: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Clears the stacked FABs (scan sits above "Créer") so the last campaign row
  // stays tappable.
  listContent: { paddingHorizontal: 16, paddingBottom: 160 },
  item: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  empty: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 4,
  },
  // Match the DS card surface used by the dice-roller dialog: tighter radius +
  // a 1px gold hairline (Paper's default Dialog corner balloons and has no border).
  dialog: { borderRadius: 18, borderWidth: 1 },
  dialogContent: { gap: 16 },
});
