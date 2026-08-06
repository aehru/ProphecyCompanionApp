import { type Href, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import SectionCard from '@/components/ui/section-card';
import { dsIcon, type IconName } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { SINK_DESCRIPTION } from '@/lib/log';

/**
 * Plain-language privacy screen — the in-app counterpart of PRIVACY.md, written
 * for a beta tester rather than for a lawyer. It answers, in order, the three
 * questions someone actually asks before tapping « Partager » : what is written
 * down, what is deliberately never written down, and who can see it.
 *
 * Keep this file and PRIVACY.md in step: if the allow-list in `lib/log/redact`
 * changes, both descriptions change with it.
 */
export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={[styles.content, contentWidth]}>
      <Lead>
        Prophecy fonctionne hors ligne. Vos personnages, vos notes et votre partie restent sur cet
        appareil, dans une base de données privée. L’application n’a ni compte, ni publicité, ni
        outil de mesure d’audience.
      </Lead>

      <SectionCard title="Le journal de diagnostic" icon="journal">
        <Body>
          Pendant la bêta, l’application note ce qu’elle fait — écrans ouverts, enregistrements en
          base, erreurs — pour qu’un problème puisse être compris après coup. Ce journal est
          conservé {SINK_DESCRIPTION}.
        </Body>
        <Bullet icon="scroll">
          Il ne contient que les 1500 dernières lignes (512 Ko au maximum), et rien de plus vieux
          que 7 jours.
        </Bullet>
        <Bullet icon="key">
          Un identifiant de session est tiré au hasard à chaque démarrage. Il n’est jamais
          enregistré et ne dépend pas de l’appareil : deux journaux envoyés à deux jours
          d’intervalle ne peuvent pas être rapprochés.
        </Bullet>
        <Bullet icon="close">
          Aucun envoi automatique. Rien ne part vers un serveur, et un plantage n’est jamais remonté
          tout seul.
        </Bullet>
      </SectionCard>

      <SectionCard title="Ce qui n’y figure jamais" icon="shield">
        <Body>
          Le journal fonctionne par liste blanche : seules les informations explicitement autorisées
          y sont écrites, tout le reste est supprimé et simplement compté. Ne sont donc jamais
          enregistrés :
        </Body>
        <Bullet icon="character">
          les noms, concepts, biographies, notes, conditions et libellés que vous saisissez — un
          personnage est désigné par un identifiant technique, jamais par son nom ;
        </Bullet>
        <Bullet icon="coin">le contenu de vos fiches : caractéristiques, argent, sorts, équipement ;</Bullet>
        <Bullet icon="key">
          les codes de campagne, adresses de serveur et jetons de MJ.
        </Bullet>
        <Body>
          Les textes trop longs sont raccourcis, et les messages d’erreur techniques sont conservés
          tels que le système les produit.
        </Body>
      </SectionCard>

      <SectionCard title="Qui peut le lire" icon="pin">
        <Body>
          Personne, tant que vous ne le partagez pas. L’écran Diagnostic vous laisse relire chaque
          ligne avant de décider. « Partager » ouvre le menu de partage du système : c’est vous qui
          choisissez le destinataire, et c’est le seul chemin par lequel ces informations peuvent
          quitter l’appareil. « Effacer » les supprime définitivement.
        </Body>
      </SectionCard>

      <SectionCard title="Le mode campagne" icon="map">
        <Body>
          Si — et seulement si — vous rejoignez une campagne avec un serveur et partagez un
          personnage, un extrait réduit de ce personnage est transmis au MJ : nom, blessures,
          ressources, initiative, conditions, compétences acquises et effets en cours. Ni votre
          biographie, ni vos notes, ni votre argent, ni votre magie. En solo, rien ne quitte
          l’appareil.
        </Body>
      </SectionCard>

      <View style={styles.actions}>
        <Button
          mode="contained"
          icon={dsIcon('journal')}
          onPress={() => router.push('/diagnostics' as Href)}>
          Ouvrir le journal
        </Button>
      </View>
    </ScrollView>
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

/** A DS-iconned bullet — same register as the rest of the app's list rows. */
function Bullet({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  const theme = useProphecyTheme();
  const Glyph = dsIcon(icon);
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletIcon}>
        <Glyph size={16} color={theme.colors.secondary} />
      </View>
      <Text variant="bodyMedium" style={[styles.bulletText, { color: theme.colors.onSurfaceVariant }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 24 },
  bullet: { flexDirection: 'row', gap: 10 },
  // Nudge the glyph onto the first line's baseline instead of the box's top.
  bulletIcon: { paddingTop: 3 },
  bulletText: { flex: 1 },
  actions: { flexDirection: 'row' },
});
