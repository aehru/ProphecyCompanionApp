import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { RoleCard, ShareNotice, tableSummary, TableRow } from '@/components/campaign/campaign-home';
import { QrScannerModal } from '@/components/campaign/qr-scanner';
import DsDialog from '@/components/ui/ds-dialog';
import GroupedList from '@/components/ui/grouped-list';
import { dsIcon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-card';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import {
  allMembersQuery,
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
  const { data: membersData } = useLiveQuery(allMembersQuery());
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

  const cancel = () => setDialog(null);

  const submit = async () => {
    setBusy(true);
    try {
      // Neither touches the network. A table stays local until a relay is
      // attached from inside it; joining only records the code and the server
      // — the connection happens when the player goes live.
      const row =
        dialog === 'create'
          ? await createLocalTable(name.trim())
          : await joinCampaign(code, serverUrl.trim());
      setDialog(null);
      setName('');
      setCode('');
      router.push(`/campaigns/${row.id}` as Href);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
    } finally {
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
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: () =>
            deleteCampaign(id).catch((e) =>
              Alert.alert('Suppression impossible', e instanceof Error ? e.message : String(e)),
            ),
        },
      ],
    );
  };

  const canSubmit =
    dialog === 'create'
      ? name.trim().length > 0
      : serverUrl.trim().length > 0 && code.trim().length >= 4;

  const members = membersData ?? [];
  const summaryOf = (c: (typeof campaigns)[number]) =>
    tableSummary(
      c.role,
      members.filter((m) => m.campaignId === c.id),
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, contentWidth]}>
        <RoleCard
          icon="map"
          title="Je mène la partie"
          body="PNJ, initiative et fiches de toute la table, hors ligne. Un serveur est facultatif.">
          <Button
            mode="contained"
            icon={dsIcon('plus')}
            testID="fab-new-table"
            style={styles.half}
            compact
            onPress={() => openDialog('create')}>
            Nouvelle table
          </Button>
          {/* Here rather than on the character list: generating a PNJ is GM
              work. The PNJ lands in the character list all the same — it is a
              full character row (kind = 'npc'), and any table can pick it up. */}
          <Button
            mode="outlined"
            testID="generate-npc"
            style={styles.half}
            compact
            onPress={() => router.push('/npc/generate')}>
            Générer un PNJ
          </Button>
        </RoleCard>

        <RoleCard
          icon="character"
          title="Je joue"
          body="Rejoignez la table de votre MJ et diffusez un personnage.">
          <Button
            mode="contained"
            testID="join-with-code"
            style={styles.half}
            compact
            onPress={() => openDialog('join')}>
            Saisir un code
          </Button>
          <Button
            mode="outlined"
            icon="qrcode-scan"
            testID="fab-scan-qr"
            style={styles.half}
            compact
            onPress={() => setScanning(true)}>
            Scanner
          </Button>
        </RoleCard>

        <SectionHeader title="Mes tables" />
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
                borderColor: theme.prophecy.border,
              },
            ]}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Aucune table pour l’instant.
            </Text>
          </View>
        ) : (
          <GroupedList>
            {campaigns.map((c) => (
              <TableRow
                key={c.id}
                campaign={c}
                summary={summaryOf(c)}
                onPress={() => router.push(`/campaigns/${c.id}` as Href)}
                onLongPress={() => confirmDelete(c.id, c.role, c.serverUrl != null)}
              />
            ))}
          </GroupedList>
        )}

        {/* The consent notice (GM included) now lives on the privacy page; the
            join dialog repeats a short version, since a QR/deep-link join opens
            straight onto it. */}
        <ShareNotice onRead={() => router.push('/privacy')} />
      </ScrollView>

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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  // `compact` on each: Paper's 24dp label margins truncate two buttons side by
  // side on a phone.
  half: { flex: 1 },
  loading: { padding: 24, alignItems: 'center' },
  empty: { padding: 16, borderRadius: 18, borderWidth: 1 },
});
