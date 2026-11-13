import { type Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, List, Switch } from 'react-native-paper';

import SectionCard from '@/components/ui/section-card';
import { useCharacterImport } from '@/hooks/use-character-import';
import { useKeepAwakePref } from '@/hooks/use-keep-awake';
import { useLastBackup } from '@/hooks/use-last-backup';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { backupAge } from '@/lib/backup-age';
import { shareExport } from '@/lib/character-transfer-io';
import { exportCharacters } from '@/repositories/transfer';

/**
 * « Plus » — everything that is about the APP rather than one character: the
 * device's backup, import, appearance and the help pages. It replaced the ⋮
 * menu on Personnages, where none of this was discoverable.
 */
export default function MoreScreen() {
  const router = useRouter();
  const theme = useProphecyTheme();
  const { lastAt, readAt, record } = useLastBackup();
  const age = backupAge(lastAt, readAt);
  const { busy: importing, runImport } = useCharacterImport();
  const [backingUp, setBackingUp] = useState(false);
  const busy = importing || backingUp;
  const { keepAwake, setKeepAwake } = useKeepAwakePref();

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await shareExport(await exportCharacters(undefined, 'backup'), 'backup');
      await record();
    } catch (e) {
      Alert.alert('Sauvegarde impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBackingUp(false);
    }
  };

  const go = (href: string) => () => router.push(href as Href);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, contentWidth]}>
      <SectionCard title="Mes données" icon="scroll">
        <NavGroup>
          <NavRow
            icon="tray-arrow-up"
            title="Sauvegarder mes personnages"
            // Blank until the first read lands, so a stale dot never flashes.
            description={readAt ? `Dernière sauvegarde : ${age.label}` : ' '}
            warn={readAt > 0 && age.stale}
            disabled={busy}
            onPress={handleBackup}
          />
          <NavRow
            icon="tray-arrow-down"
            title="Importer un fichier"
            disabled={busy}
            onPress={runImport}
          />
          <NavRow
            icon="refresh"
            title="Mettre à jour les fiches depuis le catalogue"
            onPress={go('/catalog-sync')}
          />
        </NavGroup>
      </SectionCard>

      <SectionCard title="Affichage" icon="sun">
        <NavGroup>
          <NavRow icon="palette-outline" title="Apparence" onPress={go('/appearance')} />
          <List.Item
            title="Garder l'écran allumé"
            description="Empêche la mise en veille pendant la partie"
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(p) => <List.Icon {...p} icon="cellphone-lock" color={theme.colors.primary} />}
            right={() => (
              <Switch
                value={keepAwake}
                onValueChange={setKeepAwake}
                accessibilityLabel="Garder l'écran allumé"
              />
            )}
            onPress={() => setKeepAwake(!keepAwake)}
          />
        </NavGroup>
      </SectionCard>

      <SectionCard title="Aide" icon="compass">
        <NavGroup>
          <NavRow
            icon="clipboard-text-clock-outline"
            title="Diagnostic"
            onPress={go('/diagnostics')}
          />
          <NavRow icon="shield-lock-outline" title="Confidentialité" onPress={go('/privacy')} />
          <NavRow icon="information-outline" title="À propos" onPress={go('/about')} />
        </NavGroup>
      </SectionCard>
    </ScrollView>
  );
}

/** The rows of one section in a single card (company-card's surface + hairline), divided. */
function NavGroup({ children }: { children: React.ReactNode }) {
  const theme = useProphecyTheme();
  const rows = React.Children.toArray(children);
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft },
      ]}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Divider style={{ backgroundColor: theme.prophecy.borderSoft }} />}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * One in-app destination: gold glyph, chevron. `warn` swaps the chevron for an
 * error-coloured dot — the backup row's « it's been too long ». `List.Icon` in
 * both slots keeps the row free of nested buttons on web.
 */
function NavRow({
  icon,
  title,
  description,
  warn,
  disabled,
  onPress,
}: {
  icon: string;
  title: string;
  description?: string;
  warn?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <List.Item
      title={title}
      description={description}
      titleStyle={{ color: theme.colors.onSurface }}
      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
      left={(p) => <List.Icon {...p} icon={icon} color={theme.colors.primary} />}
      right={(p) =>
        warn ? (
          <View
            accessibilityLabel="Sauvegarde ancienne"
            style={[styles.dot, { backgroundColor: theme.colors.error }]}
          />
        ) : (
          <List.Icon {...p} icon="chevron-right" color={theme.colors.onSurfaceVariant} />
        )
      }
      disabled={disabled}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 24 },
  group: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  dot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'center', marginHorizontal: 8 },
});
