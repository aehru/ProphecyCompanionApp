import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { initials } from '@/components/campaign/roster-accents';
import { useCasteAccent } from '@/hooks/use-caste-accent';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The character-to-be's portrait: the picked image, or the name's initials,
 * ringed in the caste's accent. Tappable when `onPress` is given (Identité),
 * read-only otherwise (Récapitulatif).
 */
export default function CreationAvatar({
  nom,
  caste,
  uri,
  size,
  onPress,
}: {
  nom: string;
  caste: string;
  uri: string | null;
  size: number;
  onPress?: () => void;
}) {
  const theme = useProphecyTheme();
  const ring = useCasteAccent(caste) ?? theme.colors.primary;
  return (
    <Pressable
      testID="creation-avatar"
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={onPress ? 'Choisir un portrait' : undefined}
      onPress={onPress}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring,
          backgroundColor: theme.colors.surfaceVariant,
        },
      ]}>
      {uri ? (
        <Image source={uri} style={styles.img} contentFit="cover" />
      ) : (
        <Text variant="titleLarge" style={{ color: ring }}>
          {initials(nom)}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
});
