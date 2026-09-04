import { type Href, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import LevelSwitcher from '@/components/diagnostics/level-switcher';
import LogLine from '@/components/diagnostics/log-line';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { contentWidth } from '@/hooks/use-layout';
import { useLogTail } from '@/hooks/use-log-tail';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { newIssueUrl, openExternal } from '@/lib/links';
import { APP_VERSION, log, setLogLevel, SESSION_ID, type LogEntry, type LogLevel } from '@/lib/log';
import { copyDiagnostics, shareDiagnostics } from '@/lib/log/share';

const keyExtractor = (e: LogEntry, i: number) => `${e.t}-${i}`;

/**
 * The Diagnostic screen: what the log holds right now, and the three ways to do
 * something with it. Sharing (or copying) is the ONLY way any of this leaves the
 * device — the app has no server, no analytics and no automatic crash upload.
 */
export default function DiagnosticsScreen() {
  const theme = useProphecyTheme();
  const router = useRouter();
  const entries = useLogTail();
  const [level, setLevel] = useState<LogLevel>(() => log.getLevel());
  const [busy, setBusy] = useState(false);

  // Newest first: the reason the screen was opened is almost always the last
  // thing that happened.
  const tail = entries.slice().reverse();
  const { bytes } = log.size;

  const handleLevel = useCallback((next: LogLevel) => {
    setLevel(next);
    setLogLevel(next).catch(() => {});
  }, []);

  const handleShare = useCallback(async () => {
    setBusy(true);
    try {
      await shareDiagnostics();
    } catch (e) {
      Alert.alert('Partage impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    setBusy(true);
    try {
      const n = await copyDiagnostics();
      Alert.alert('Copié', `${n} caractères copiés dans le presse-papiers.`);
    } catch (e) {
      Alert.alert('Copie impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // Version + platform only. The log itself never rides in a URL — the share
  // sheet is its one exit, and a query string would be a second one.
  const handleReport = useCallback(() => {
    void openExternal(newIssueUrl(`Version ${APP_VERSION} · ${Platform.OS}`));
  }, []);

  // Destructive → native confirm, per the app's convention for irreversible acts.
  const handleClear = useCallback(() => {
    Alert.alert(
      'Effacer le journal',
      'Le journal en mémoire et les fichiers enregistrés seront supprimés. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            log.clear().catch(() => {});
          },
        },
      ],
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, contentWidth]}>
        <SectionCard title="Niveau de détail" icon="filter">
          <LevelSwitcher value={level} onChange={handleLevel} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {entries.length} entrée{entries.length > 1 ? 's' : ''} · {Math.round(bytes / 1024)} Ko ·
            session {SESSION_ID} · version {APP_VERSION}
          </Text>
        </SectionCard>

        <SectionCard title="Journal" icon="journal" helper="7 jours">
          <View style={styles.actions}>
            <Button
              mode="contained"
              icon={dsIcon('scroll')}
              disabled={busy}
              onPress={handleShare}>
              Partager
            </Button>
            <Button icon={dsIcon('journal')} disabled={busy} onPress={handleCopy}>
              Copier
            </Button>
            <Button icon={dsIcon('close')} disabled={busy} onPress={handleClear}>
              Effacer
            </Button>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Rien n’est envoyé automatiquement. Le partage est le seul moyen de faire sortir ces
            informations de l’appareil.{' '}
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.primary }}
              onPress={() => router.push('/privacy' as Href)}>
              En savoir plus
            </Text>
          </Text>
        </SectionCard>

        {/* Folded by default: a tester opens this screen to READ the log far more
            often than to file a ticket, and the section's blurb is three lines. */}
        <SectionCard title="Signaler un problème" icon="bell" collapsible defaultExpanded={false}>
          <View style={styles.actions}>
            <Button icon="bug-outline" onPress={handleReport}>
              Ouvrir un ticket
            </Button>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Le ticket s’ouvre sur GitHub, pré-rempli avec la version et le système — rien d’autre.
            Décrivez ce que vous faisiez, puis joignez le journal si vous le voulez : c’est
            « Partager » ci-dessus qui le sort de l’appareil, jamais ce bouton.
          </Text>
        </SectionCard>
      </View>

      {tail.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Le journal est vide.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tail}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.listContent, contentWidth]}
          renderItem={({ item }) => <LogLine entry={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, gap: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
