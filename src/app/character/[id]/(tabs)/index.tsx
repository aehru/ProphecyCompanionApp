import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import CasteChip from '@/components/caste-chip';
import ConceptChip from '@/components/concept-chip';
import PortraitHero from '@/components/portrait-hero';
import StatutChip from '@/components/statut-chip';
import {
  StatutBenefitsSection,
  StatutTechniquesSection,
} from '@/components/statut-sections';
import TendancesCircles from '@/components/tendances-circles';
import TraitsSection from '@/components/traits-section';
import { characterFallback } from '@/components/ui/character-gate';
import Columns from '@/components/ui/columns';
import Icon, { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { RESOURCES, WOUND_LEVELS } from '@/constants/prophecy';
import { useCharacterId } from '@/hooks/use-character-id';
import { useSplitWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { asNumRecord } from '@/lib/character-values';
import { mediaUri, pickCharacterMedia } from '@/lib/media';
import { actualStateQuery } from '@/repositories/actual-state';
import { characterQuery, setCharacterMedia } from '@/repositories/characters';

/**
 * Character home dashboard — the glanceable, read-only landing (modelled on the
 * DS "Home Dashboard"). Identity header + the three tendances ring gauges (in
 * place of the DS hero card's health/magic bars), a compact vitals summary, and
 * the portrait illustration. All editing lives on the Fiche tab; the exceptions
 * here are the avatar (tap the hero) and the portrait (ILLUSTRATION card).
 *
 * The hero has TWO shapes and the portrait decides: with one, `<PortraitHero>`
 * gives the illustration the whole card and lays the identity and the rings over
 * it; without, the compact hero below draws the same three things on parchment.
 * A character with only an avatar, or with no image at all, is untouched.
 */
export default function CharacterDashboardScreen() {
  const numId = useCharacterId();
  const theme = useProphecyTheme();
  const { data: charRows, updatedAt } = useLiveQuery(characterQuery(numId), [numId]);
  const { data: stateRows } = useLiveQuery(actualStateQuery(numId), [numId]);
  // `undefined` while the first read is in flight (characterFallback spins),
  // `null` once it came back empty.
  const char = updatedAt === undefined ? undefined : (charRows?.[0] ?? null);
  const state = stateRows?.[0] ?? null;
  // Illustrations are the one thing editable from the otherwise read-only
  // dashboard, and the ILLUSTRATION card keeps that job even when the portrait
  // hero is showing the image — a tap on the hero must never open the gallery.
  const [busyPortrait, setBusyPortrait] = useState(false);
  const splitWidth = useSplitWidth();

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);
  const avatar = mediaUri(char.avatarPath);
  const portrait = mediaUri(char.portraitPath);

  // Compact vitals: total wound boxes taken vs max, and the two resource pools.
  const woundFilled = WOUND_LEVELS.reduce((n, w) => n + (stRec[`${w.key}Current`] ?? 0), 0);
  const woundMax = WOUND_LEVELS.reduce((n, w) => n + (rec[`${w.key}Max`] ?? 0), 0);

  // The live queries redraw the hero the moment the row changes, so nothing
  // here reloads. A failed copy is the one thing worth a word.
  const mediaFailed = (e: unknown) =>
    Alert.alert('Illustration impossible', e instanceof Error ? e.message : String(e));

  const pickAvatar = async () => {
    try {
      const path = await pickCharacterMedia(numId, 'avatar');
      if (path) await setCharacterMedia(numId, 'avatar', path);
    } catch (e) {
      mediaFailed(e);
    }
  };

  const pickPortrait = async () => {
    setBusyPortrait(true);
    try {
      const path = await pickCharacterMedia(numId, 'portrait');
      if (path) await setCharacterMedia(numId, 'portrait', path);
    } catch (e) {
      mediaFailed(e);
    } finally {
      setBusyPortrait(false);
    }
  };

  const clearPortrait = () => setCharacterMedia(numId, 'portrait', null).catch(mediaFailed);

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.container, splitWidth]}>
      {/* Hero: the portrait one when there is a portrait, the compact card
          otherwise. Both carry the identity and the three tendance gauges. */}
      {portrait ? (
        <PortraitHero
          portrait={portrait}
          avatar={avatar}
          nom={char.nom}
          caste={char.caste}
          statut={char.statut}
          darkOrders={char.darkOrders}
          concept={char.concept}
          tendances={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })}
          onPickAvatar={pickAvatar}
        />
      ) : (
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
            {/* Caste then concept — the closed set before the free text, same
                order as the list rows. Independent chips, so an empty one
                simply doesn't render. */}
            {char.concept || char.caste ? (
              <View style={styles.chips}>
                <CasteChip caste={char.caste} />
                {/* The Statut belongs to the caste, so it follows it — and it is
                    the one chip here that is tappable (it opens the rung). */}
                <StatutChip caste={char.caste} statut={char.statut} darkOrders={char.darkOrders} />
                <ConceptChip concept={char.concept} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.prophecy.borderSoft }]} />

        <TendancesCircles get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })} />
      </View>
      )}

      <Columns>
        {/* At-a-glance vitals (read-only; edit on the Fiche). */}
        <SectionCard title="EN BREF" icon="compass">
          <View style={styles.vitals}>
            <Vital label="Blessures" value={`${woundFilled}/${woundMax}`} />
            {RESOURCES.map((r) => (
              <Vital
                key={r.key}
                label={r.label}
                value={`${stRec[`${r.key}Current`] ?? 0}/${rec[`${r.key}Max`] ?? 0}`}
              />
            ))}
          </View>
        </SectionCard>

        {/* What the caste ladder gives, then what the player bought: the two
            statut sections read as one block under the Statut that grants them,
            with the avantages — the character's own choices — after. Both
            derive from `caste` + `statut` and both disappear at Statut 0. */}
        <StatutBenefitsSection caste={char.caste} statut={char.statut} darkOrders={char.darkOrders} />
        <StatutTechniquesSection caste={char.caste} statut={char.statut} darkOrders={char.darkOrders} />

        {/* Points earned and spent, then both lists. Read-only like the rest of
            the dashboard: a row opens its editor as a modal. */}
        <TraitsSection characterId={numId} />

        {/* Portrait controls. No preview here once there is a portrait — the
            hero above IS the preview — so the card is down to the two actions;
            the avatar is still set by tapping it on either hero. */}
        <SectionCard title="ILLUSTRATION" icon="character">
          {portrait ? (
            <View style={styles.portraitActions}>
              <Button compact icon={dsIcon('edit')} loading={busyPortrait} onPress={pickPortrait}>
                Remplacer le portrait
              </Button>
              <Button compact textColor={theme.colors.error} onPress={clearPortrait}>
                Retirer le portrait
              </Button>
            </View>
          ) : (
            <Button mode="outlined" icon={dsIcon('plus')} loading={busyPortrait} onPress={pickPortrait}>
              Ajouter un portrait
            </Button>
          )}
        </SectionCard>
      </Columns>
    </ScrollView>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  const theme = useProphecyTheme();
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  divider: { height: 1 },
  portraitActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  vitals: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  vital: { alignItems: 'center', gap: 2 },
  vitalLabel: { fontSize: 12 },
  vitalValue: { fontFamily: 'Cinzel_600SemiBold', fontSize: 18 },
});
