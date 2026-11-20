import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import Icon, { type IconName } from '@/components/ui/icon';
import { useCharacterImport } from '@/hooks/use-character-import';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The roster's « + » lands here: three ways to start a character. Guided is the
 * default; the full form is today's sheet for copying a paper one; import is
 * the same flow as « Plus → Importer un fichier ».
 */
export default function NewCharacterScreen() {
  const router = useRouter();
  const theme = useProphecyTheme();
  const { busy, runImport } = useCharacterImport();

  const importFile = async () => {
    if (await runImport()) router.back();
  };

  return (
    <ScrollView contentContainerStyle={[styles.page, contentWidth]}>
      <Text variant="headlineSmall">Qui s’éveille sur le dos de Moryagorn ?</Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        Choisissez comment commencer. Rien n’est figé : tout reste modifiable sur la fiche.
      </Text>
      <StartOption
        icon="compass"
        title="Création guidée"
        body="Caste, identité, tendances, caractéristiques — une étape à la fois, avec un aperçu du personnage qui se dessine."
        recommended
        testID="start-guided"
        onPress={() => router.replace('/character/create' as Href)}
      />
      <StartOption
        icon="scroll"
        title="Fiche complète"
        body="Vous recopiez une fiche papier existante : tous les champs d’un coup."
        testID="start-full"
        onPress={() => router.replace('/character/new-full' as Href)}
      />
      <StartOption
        icon="book"
        title="Importer un fichier"
        body="Une sauvegarde, ou un personnage partagé par un autre joueur."
        testID="start-import"
        disabled={busy}
        onPress={importFile}
      />
    </ScrollView>
  );
}

function StartOption({
  icon,
  title,
  body,
  recommended,
  disabled,
  testID,
  onPress,
}: {
  icon: IconName;
  title: string;
  body: string;
  recommended?: boolean;
  disabled?: boolean;
  testID: string;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  const c = theme.colors;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: recommended ? c.secondaryContainer : c.surface,
          borderColor: recommended ? c.primary : theme.prophecy.border,
          borderWidth: recommended ? 1.5 : 1,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}>
      <View style={[styles.optionIcon, { backgroundColor: c.surfaceVariant }]}>
        <Icon name={icon} size={24} color={c.primary} />
      </View>
      <View style={styles.optionText}>
        {recommended ? (
          <Text style={[styles.tag, { backgroundColor: c.primaryContainer, color: c.onPrimaryContainer }]}>
            Recommandé
          </Text>
        ) : null}
        <Text variant="titleMedium">{title}</Text>
        <Text variant="bodyMedium" style={{ color: c.onSurfaceVariant }}>
          {body}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14 },
  option: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', padding: 16, borderRadius: 16 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 4 },
  tag: { alignSelf: 'flex-start', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
});
