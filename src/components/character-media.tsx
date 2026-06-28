import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { mediaUri, pickCharacterMedia, type MediaSlot } from '@/lib/media';
import { setCharacterMedia } from '@/repositories/characters';

/**
 * Avatar (round head) + full portrait for a character. Read-only by default;
 * when `editing` is on, each slot becomes tappable to pick/replace and gains a
 * remove button. Hidden entirely when nothing is set and not editing, so a
 * character without illustrations doesn't carry an empty card.
 */
export default function CharacterMedia({
  characterId,
  avatarPath,
  portraitPath,
  editing,
  onChanged,
}: {
  characterId: number;
  avatarPath?: string | null;
  portraitPath?: string | null;
  editing: boolean;
  onChanged: () => void;
}) {
  const theme = useProphecyTheme();
  const [busy, setBusy] = useState<MediaSlot | null>(null);
  // Full portrait is large; keep it collapsed by default so the résumé stays
  // compact. The avatar always shows.
  const [showPortrait, setShowPortrait] = useState(false);
  const avatar = mediaUri(avatarPath);
  const portrait = mediaUri(portraitPath);

  const pick = async (slot: MediaSlot) => {
    setBusy(slot);
    try {
      const path = await pickCharacterMedia(characterId, slot);
      if (path) {
        await setCharacterMedia(characterId, slot, path);
        onChanged();
      }
    } finally {
      setBusy(null);
    }
  };

  const clear = async (slot: MediaSlot) => {
    await setCharacterMedia(characterId, slot, null);
    onChanged();
  };

  if (!editing && !avatar && !portrait) return null;

  return (
    <SectionCard title="ILLUSTRATIONS">
      <View style={styles.row}>
        <Pressable
          onPress={editing ? () => pick('avatar') : undefined}
          style={[
            styles.avatar,
            {
              borderColor: theme.prophecy.border,
              backgroundColor: theme.prophecy.surfaceContainerLow,
            },
          ]}>
          {avatar ? (
            <Image source={avatar} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>Avatar</Text>
          )}
        </Pressable>

        {editing ? (
          <View style={styles.avatarActions}>
            <Button
              compact
              icon={dsIcon(avatar ? 'edit' : 'plus')}
              loading={busy === 'avatar'}
              onPress={() => pick('avatar')}>
              {avatar ? "Changer l'avatar" : "Ajouter un avatar"}
            </Button>
            {avatar ? (
              <Button compact textColor={theme.colors.error} onPress={() => clear('avatar')}>
                Retirer
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>

      {portrait || editing ? (
        <Button
          compact
          icon={dsIcon('chev')}
          onPress={() => setShowPortrait((s) => !s)}>
          {showPortrait ? 'Masquer le portrait' : 'Afficher le portrait'}
        </Button>
      ) : null}

      {showPortrait ? (
        portrait ? (
          <Pressable onPress={editing ? () => pick('portrait') : undefined}>
            <Image
              source={portrait}
              style={[styles.portrait, { borderColor: theme.prophecy.border }]}
              contentFit="cover"
            />
          </Pressable>
        ) : editing ? (
          <Button
            mode="outlined"
            icon={dsIcon('plus')}
            loading={busy === 'portrait'}
            onPress={() => pick('portrait')}>
            Ajouter un portrait
          </Button>
        ) : null
      ) : null}

      {showPortrait && editing && portrait ? (
        <Button compact textColor={theme.colors.error} onPress={() => clear('portrait')}>
          Retirer le portrait
        </Button>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarActions: { flex: 1, gap: 4, alignItems: 'flex-start' },
  portrait: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 1,
  },
});
