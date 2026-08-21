// Backup vs share (issue #43). The two exports differ by one invisible field —
// the portable uuid — and the consequences are opposite, so the choice is made
// here, spelled out, instead of being guessed at import time.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import DsDialog from '@/components/ui/ds-dialog';
import Icon, { type IconName } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { ExportIntent } from '@/lib/character-transfer';

const CHOICES: { intent: ExportIntent; icon: IconName; title: string; body: string }[] = [
  {
    intent: 'backup',
    icon: 'journal',
    title: 'Sauvegarde',
    body:
      'Pour vous, sur cet appareil ou un nouveau. Le personnage garde son identité : le réimporter remplace la fiche existante au lieu de la doubler, et il retrouve sa place dans vos campagnes ainsi que les notes du MJ. Blessures, réserves et effets sont conservés tels quels.',
  },
  {
    intent: 'share',
    icon: 'character',
    title: 'Partage',
    body:
      'Pour envoyer le personnage à quelqu’un d’autre. La copie reçue devient un personnage indépendant, sans lien avec vos campagnes ni les notes du MJ — sinon vos deux appareils se disputeraient la même place autour de la table. Ses réserves magiques arrivent pleines ; blessures et effets en cours suivent.',
  },
];

export default function ExportIntentDialog({
  visible,
  count,
  onDismiss,
  onChoose,
}: {
  visible: boolean;
  /** How many characters are about to be written — the title says it out loud. */
  count: number;
  onDismiss: () => void;
  onChoose: (intent: ExportIntent) => void;
}) {
  const theme = useProphecyTheme();
  return (
    <DsDialog
      visible={visible}
      onDismiss={onDismiss}
      title={`Exporter ${count} personnage${count > 1 ? 's' : ''}`}
      // The two rows ARE the confirming actions — only the way out belongs here.
      dismiss={<Button onPress={onDismiss}>Annuler</Button>}>
      {CHOICES.map((c) => (
        <Pressable
          key={c.intent}
          onPress={() => onChoose(c.intent)}
          style={[
            styles.row,
            {
              backgroundColor: theme.prophecy.surfaceContainerLow,
              borderColor: theme.colors.outlineVariant,
            },
          ]}>
          <View
            style={[
              styles.tile,
              { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft },
            ]}>
            <Icon name={c.icon} size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.main}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              {c.title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {c.body}
            </Text>
          </View>
        </Pressable>
      ))}
    </DsDialog>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, minWidth: 0, gap: 4 },
});
