import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { Button, IconButton, List, Text, TextInput } from 'react-native-paper';

import { QrScannerModal } from '@/components/campaign/qr-scanner';
import AppFab from '@/components/ui/app-fab';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  campaignsListQuery,
  createLocalTable,
  deleteCampaign,
  joinCampaign,
} from '@/repositories/campaigns';

type DialogKind = 'create' | 'join' | null;

export default function CampaignsScreen() {
  const router = useRouter();
  const theme = useProphecyTheme();
  const { data, updatedAt } = useLiveQuery(campaignsListQuery());
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  const campaigns = data ?? [];
  // Same reason as the characters list: `data` starts at [], so « Aucune table »
  // would flash before the first query returns.
  const loading = updatedAt === undefined;
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
  // Local tables have none, so look for the last row that actually has one.
  const openDialog = (kind: DialogKind) => {
    if (!serverUrl) {
      const lastServer = [...campaigns].reverse().find((c) => c.serverUrl)?.serverUrl;
      if (lastServer) setServerUrl(lastServer);
    }
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
      // Creating a table touches no network at all — the relay is attached
      // later, from the table itself, and only if the GM wants the players'
      // sheets. Joining one obviously needs a server.
      const row =
        dialog === 'create'
          ? await createLocalTable(name.trim())
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

  const confirmDelete = (id: number, role: string, attached: boolean) => {
    Alert.alert(
      role === 'gm' ? 'Supprimer la table ?' : 'Quitter la campagne ?',
      role === 'gm'
        ? attached
          ? 'La table et toutes les fiches partagées seront effacées du serveur. Vos PNJ restent dans vos personnages.'
          : 'La table et vos notes seront effacées. Vos PNJ restent dans vos personnages.'
        : 'Vos notes locales pour cette campagne seront effacées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: () => deleteCampaign(id) },
      ],
    );
  };

  const canSubmit =
    dialog === 'create'
      ? name.trim().length > 0
      : serverUrl.trim().length > 0 && code.trim().length >= 4;

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
          Une table fonctionne hors ligne : vos PNJ, leur initiative et leurs fiches restent sur
          votre appareil. Connecter un serveur est facultatif — il sert à voir les personnages de
          vos joueurs. Dans ce cas, lorsqu’un joueur partage un personnage, un extrait (nom, état de
          combat, caractéristiques) est envoyé au serveur choisi et conservé sous la responsabilité
          de son hébergeur. Arrêter le partage ou quitter la campagne en demande l’effacement.
        </Text>
      </View>

      {loading ? (
        <View testID="campaigns-loading" style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : campaigns.length === 0 ? (
        <View
          testID="campaigns-empty"
          style={[
            styles.empty,
            {
              backgroundColor: theme.prophecy.surfaceContainerLow,
              borderColor: theme.colors.outlineVariant,
            },
          ]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Aucune table
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Créez une table pour gérer vos PNJ et leur initiative — sans serveur. Joueur ? Rejoignez
            avec le code du MJ.
          </Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          contentContainerStyle={[styles.listContent, contentWidth]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            // The delete button is a SIBLING of the row, not its `right` slot: a
            // List.Item with onPress renders a real <button> on web, and the slot
            // renders inside it — a nested <button> is invalid HTML, which React
            // rejects and which leaves the inner button's clicks undefined.
            <View
              style={[
                styles.item,
                styles.itemRow,
                {
                  backgroundColor: theme.prophecy.surfaceContainerLow,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}>
              <List.Item
                style={styles.itemMain}
                testID={`campaign-row-${item.id}`}
                title={item.name}
                description={`${item.role === 'gm' ? 'MJ' : 'Joueur'} · ${item.code ?? 'hors ligne'}`}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                left={(p) => (
                  <List.Icon {...p} icon={item.role === 'gm' ? 'crown' : 'account-group'} />
                )}
                onPress={() => router.push(`/campaigns/${item.id}` as Href)}
              />
              <IconButton
                icon="delete-outline"
                testID={`campaign-delete-${item.id}`}
                accessibilityLabel={`Supprimer ${item.name}`}
                onPress={() => confirmDelete(item.id, item.role, item.serverUrl != null)}
              />
            </View>
          )}
        />
      )}

      <DsDialog
        visible={dialog !== null}
        onDismiss={cancel}
        title={dialog === 'create' ? 'Nouvelle table' : 'Rejoindre une campagne'}
        dismiss={<Button onPress={cancel}>Annuler</Button>}
        actions={
          <Button
            testID="dialog-submit"
            mode="contained"
            icon={dialog === 'create' ? 'plus' : 'location-enter'}
            onPress={submit}
            disabled={!canSubmit || busy}
            loading={busy}>
            {dialog === 'create' ? 'Créer' : 'Rejoindre'}
          </Button>
        }>
        {dialog === 'create' ? (
          <>
            <TextInput
              testID="field-table-name"
              label="Nom de la table"
              value={name}
              onChangeText={setName}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Table hors ligne : vos PNJ, leur initiative et leurs fiches restent sur cet appareil.
              Vous pourrez y connecter un serveur plus tard pour voir les personnages des joueurs.
            </Text>
          </>
        ) : (
          <>
            <TextInput
              label="Code de la campagne"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {/* `defaultValue`, NOT `value` — see the attach dialog on the table
                screen: a controlled field restarts the Android IME on the first
                keystroke and Gboard falls back from its number page to letters.
                The prefills (last server used, QR scan, deep link) all land
                while this dialog is closed, so the remount picks them up. */}
            <TextInput
              label="Serveur"
              defaultValue={serverUrl}
              onChangeText={setServerUrl}
              placeholder="exemple.fr ou 192.168.1.10:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Les données que vous choisirez de partager ensuite (nom, état de combat,
              caractéristiques) seront stockées sur ce serveur, sous la responsabilité de la
              personne qui l’héberge. Cessez le partage ou quittez la campagne pour en demander
              l’effacement.
            </Text>
          </>
        )}
      </DsDialog>

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

      <AppFab
        icon="qrcode-scan"
        testID="fab-scan-qr"
        onPress={() => setScanning(true)}
        offset={72}
      />
      <AppFab
        icon={dsIcon('plus')}
        label="Créer"
        testID="fab-new-table"
        onPress={() => openDialog('create')}
      />
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  // The row and its delete button sit side by side; the row takes the space so
  // tapping anywhere but the button still opens the campaign.
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  itemMain: { flex: 1, minWidth: 0 },
  empty: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 4,
  },
});
