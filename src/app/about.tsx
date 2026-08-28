import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import SectionCard from '@/components/ui/section-card';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  ISSUES_URL,
  LICENSE_URL,
  openExternal,
  REPO_URL,
  SERVER_REPO_URL,
} from '@/lib/links';
import { APP_VERSION } from '@/lib/log';

/**
 * « À propos » — what this app is, who may look inside it, and which version is
 * running. It exists because the project is open source and nothing in the app
 * said so: a tester who finds a bug had no address to send it to.
 *
 * Every row here LEAVES the app (see `openExternal`), which is why they all
 * carry the same trailing « open-in-new » glyph — the only visual cue a thumb
 * gets before the system browser takes over.
 */
export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={[styles.content, contentWidth]}>
      <Lead>
        Prophecy Companion est une application libre, écrite par des joueurs pour leur table. Le
        code est public : chacun peut le lire, le corriger ou l’héberger lui-même.
      </Lead>

      <SectionCard title="Le projet" icon="book">
        <LinkRow icon="github" title="Code source" description="github.com/aehru" url={REPO_URL} />
        <LinkRow
          icon="bug-outline"
          title="Signaler un problème"
          description="Ouvrir un ticket sur GitHub"
          url={ISSUES_URL}
        />
        <LinkRow
          icon="scale-balance"
          title="Licence MIT"
          description="Libre d’usage, de copie et de modification"
          url={LICENSE_URL}
        />
      </SectionCard>

      <SectionCard title="Le serveur de campagne" icon="map">
        <Body>
          Le relais qui transmet les personnages au MJ est un projet séparé, que votre groupe peut
          héberger lui-même. En solo, aucun serveur n’intervient.
        </Body>
        <LinkRow
          icon="github"
          title="ProphecyCompanionServer"
          description="Le code du relais, à héberger soi-même"
          url={SERVER_REPO_URL}
        />
      </SectionCard>

      <View style={styles.footer}>
        <Body>Version {APP_VERSION}</Body>
        <Body>
          Prophecy est une marque de ses ayants droit. Cette application est un outil de fan,
          non officiel, sans lien avec l’éditeur ni approbation de sa part.
        </Body>
      </View>
    </ScrollView>
  );
}

/**
 * One outbound link. `List.Icon` in both slots on purpose: it is a view, not a
 * button, so it stays legal inside the real <button> a pressable List.Item
 * renders on web — the nested-button trap the campaign list documents.
 */
function LinkRow({
  icon,
  title,
  description,
  url,
}: {
  icon: string;
  title: string;
  description: string;
  url: string;
}) {
  const theme = useProphecyTheme();
  return (
    <List.Item
      title={title}
      description={description}
      titleStyle={{ color: theme.colors.onSurface }}
      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
      left={(p) => <List.Icon {...p} icon={icon} color={theme.colors.secondary} />}
      right={(p) => <List.Icon {...p} icon="open-in-new" color={theme.colors.onSurfaceVariant} />}
      accessibilityHint="Ouvre la page dans le navigateur"
      onPress={() => void openExternal(url)}
    />
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  const theme = useProphecyTheme();
  return (
    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
      {children}
    </Text>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  const theme = useProphecyTheme();
  return (
    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 24 },
  footer: { gap: 8 },
});
