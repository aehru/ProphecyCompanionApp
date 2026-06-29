import { Image } from 'expo-image';
import { useNavigation } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import TendancesCircles from '@/components/tendances-circles';
import { characterFallback } from '@/components/ui/character-gate';
import Icon, { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { RESOURCES, WOUND_LEVELS } from '@/constants/prophecy';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { mediaUri, pickCharacterMedia } from '@/lib/media';
import { setCharacterMedia } from '@/repositories/characters';

/**
 * Character home dashboard — the glanceable, read-only landing (modelled on the
 * DS "Home Dashboard"). Identity header + the three tendances ring gauges (in
 * place of the DS hero card's health/magic bars), a compact vitals summary, and
 * the portrait illustration. All editing lives on the Fiche tab; the exceptions
 * here are the avatar (tap the hero) and the portrait (ILLUSTRATION card).
 */
export default function CharacterDashboardScreen() {
  const numId = useCharacterId();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  const { char, state, reload } = useCharacterState(numId, { ensure: true, reloadOnFocus: true });
  // Full portrait is large; collapsed by default. Illustrations are the one
  // thing editable from the otherwise read-only dashboard.
  const [showPortrait, setShowPortrait] = useState(false);
  const [busyPortrait, setBusyPortrait] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: char?.nom || 'Accueil' });
  }, [navigation, char?.nom]);

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);
  const avatar = mediaUri(char.avatarPath);
  const portrait = mediaUri(char.portraitPath);

  // Compact vitals: total wound boxes taken vs max, and the two resource pools.
  const woundFilled = WOUND_LEVELS.reduce((n, w) => n + (stRec[`${w.key}Current`] ?? 0), 0);
  const woundMax = WOUND_LEVELS.reduce((n, w) => n + (rec[`${w.key}Max`] ?? 0), 0);

  const pickAvatar = async () => {
    const path = await pickCharacterMedia(numId, 'avatar');
    if (path) {
      await setCharacterMedia(numId, 'avatar', path);
      reload();
    }
  };

  const pickPortrait = async () => {
    setBusyPortrait(true);
    try {
      const path = await pickCharacterMedia(numId, 'portrait');
      if (path) {
        await setCharacterMedia(numId, 'portrait', path);
        reload();
      }
    } finally {
      setBusyPortrait(false);
    }
  };

  const clearPortrait = async () => {
    await setCharacterMedia(numId, 'portrait', null);
    reload();
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Hero card: identity + tendances ring gauges (replacing health/magic). */}
      <View style={[styles.hero, { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.border }]}>
        <View style={styles.identity}>
          <Pressable
            onPress={pickAvatar}
            style={[
              styles.avatar,
              { borderColor: theme.colors.primary, backgroundColor: theme.prophecy.surfaceContainer },
            ]}>
            {avatar ? (
              <Image source={avatar} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Icon name="character" size={34} color={theme.colors.primary} />
            )}
          </Pressable>
          <View style={styles.identityText}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              {char.nom || 'Sans nom'}
            </Text>
            {char.concept ? (
              <View style={[styles.conceptChip, { borderColor: theme.prophecy.border }]}>
                <Text style={[styles.conceptText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                  {char.concept}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.prophecy.borderSoft }]} />

        <TendancesCircles get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })} />
      </View>

      {/* At-a-glance vitals (read-only; edit on the Fiche). */}
      <SectionCard title="EN BREF" icon="compass">
        <View style={styles.vitals}>
          <Vital label="Blessures" value={`${woundFilled}/${woundMax}`} theme={theme} />
          {RESOURCES.map((r) => (
            <Vital
              key={r.key}
              label={r.label}
              value={`${stRec[`${r.key}Current`] ?? 0}/${rec[`${r.key}Max`] ?? 0}`}
              theme={theme}
            />
          ))}
        </View>
      </SectionCard>

      {/* Full portrait — collapsed by default; the avatar is set via the hero tap. */}
      <SectionCard title="ILLUSTRATION" icon="character">
        {portrait ? (
          <>
            <Button compact icon={dsIcon('chev')} onPress={() => setShowPortrait((s) => !s)}>
              {showPortrait ? 'Masquer le portrait' : 'Afficher le portrait'}
            </Button>
            {showPortrait ? (
              <Pressable onPress={pickPortrait}>
                <Image
                  source={portrait}
                  style={[styles.portrait, { borderColor: theme.prophecy.border }]}
                  contentFit="cover"
                />
              </Pressable>
            ) : null}
            {showPortrait ? (
              <Button compact textColor={theme.colors.error} onPress={clearPortrait}>
                Retirer le portrait
              </Button>
            ) : null}
          </>
        ) : (
          <Button mode="outlined" icon={dsIcon('plus')} loading={busyPortrait} onPress={pickPortrait}>
            Ajouter un portrait
          </Button>
        )}
      </SectionCard>

    </ScrollView>
  );
}

function Vital({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useProphecyTheme>;
}) {
  return (
    <View style={styles.vital}>
      <Text style={[styles.vitalLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.vitalValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 32 },
  hero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  identityText: { flex: 1, gap: 6 },
  conceptChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  conceptText: { fontSize: 12 },
  divider: { height: 1 },
  portrait: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12, borderWidth: 1 },
  vitals: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  vital: { alignItems: 'center', gap: 2 },
  vitalLabel: { fontSize: 12 },
  vitalValue: { fontFamily: 'Cinzel_600SemiBold', fontSize: 18 },
});
