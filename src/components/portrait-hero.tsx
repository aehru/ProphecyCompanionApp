import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import CasteChip from '@/components/caste-chip';
import ConceptChip from '@/components/concept-chip';
import StatutChip from '@/components/statut-chip';
import TendancesCircles from '@/components/tendances-circles';
import Icon from '@/components/ui/icon';
import { type TendanceKey } from '@/constants/prophecy';
import { useLayout } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { OVERLAY_INK } from '@/theme/overlayInk';

/**
 * The dashboard hero for a character who HAS a full portrait: the illustration
 * fills the card, the three tendance rings run down its right edge, and the
 * identity sits on a scrim along the bottom.
 *
 * The compact hero stays the default — this one only stands in when
 * `portraitPath` is set (the home decides), so a sheet with an avatar or no
 * image at all is untouched.
 *
 * The portrait is cropped 3:4 at pick time and drawn `cover` **anchored top**:
 * whatever a short panel has to cut, it cuts from the feet rather than the face.
 *
 * Editing is NOT here — the ILLUSTRATION card still owns replace/remove, so a
 * thumb landing on the picture never re-opens the gallery. The one control is
 * the avatar bubble, which keeps the tap-to-pick it has on the compact hero.
 */

// Both scrims are drawn with react-native-svg — already a dependency for the
// rings — rather than expo-linear-gradient: a new native module would force a
// dev-client rebuild for a wash.
const SCRIM_HEIGHT = 0.45;
const SCRIM_COLOR = OVERLAY_INK.scrim;

/** Panel height by window class. Tall enough to read as an illustration on a
 *  phone; shorter on a tablet (the split's two columns start right underneath)
 *  and shorter again in landscape, where there is no vertical room at all. */
function heroHeight({ columns, denseVertical }: ReturnType<typeof useLayout>) {
  if (denseVertical) return 210;
  return columns > 1 ? 320 : 380;
}

export default function PortraitHero({
  portrait,
  avatar,
  nom,
  caste,
  statut,
  darkOrders,
  concept,
  tendances,
  onPickAvatar,
}: {
  darkOrders?: boolean | null;
  /** Resolved `file://` uri — the caller has already established there is one. */
  portrait: string;
  avatar: string | null;
  nom?: string | null;
  caste?: string | null;
  statut?: number | null;
  concept?: string | null;
  tendances: (key: TendanceKey) => { value: number; sub: number };
  onPickAvatar: () => void;
}) {
  const theme = useProphecyTheme();
  const layout = useLayout();
  const height = heroHeight(layout);
  const ringSize = layout.denseVertical ? 44 : 52;

  return (
    <View style={[styles.hero, { height, borderColor: theme.prophecy.border }]}>
      <Image
        source={portrait}
        style={styles.image}
        contentFit="cover"
        contentPosition="top"
        // The hero is the first thing on the tab; a fade would flash the
        // parchment through on every focus.
        transition={0}
      />

      {/* Bottom wash, under the identity block only — the rings carry their own
          discs, so darkening the whole picture would cost contrast for nothing. */}
      <View style={[styles.scrim, { height: height * SCRIM_HEIGHT }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="portraitScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={SCRIM_COLOR} stopOpacity="0" />
              <Stop offset="0.55" stopColor={SCRIM_COLOR} stopOpacity="0.55" />
              <Stop offset="1" stopColor={SCRIM_COLOR} stopOpacity="0.88" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#portraitScrim)" />
        </Svg>
      </View>

      <Pressable
        onPress={onPickAvatar}
        style={[
          styles.avatar,
          { borderColor: theme.colors.primary, backgroundColor: theme.prophecy.surfaceContainer },
        ]}>
        {avatar ? (
          <Image source={avatar} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <Icon name="character" size={20} color={theme.colors.primary} />
        )}
      </Pressable>

      <View style={styles.rings} pointerEvents="none">
        <TendancesCircles get={tendances} size={ringSize} layout="column" tone="overlay" />
      </View>

      {/* `box-none` and not `none`: the block itself must stay transparent to
          touches (it overlays the portrait), but the Statut chip inside it is
          tappable — it opens the rung. `none` would swallow that tap, which is
          what it did while every chip here was inert. */}
      <View style={styles.identity} pointerEvents="box-none">
        <Text variant="headlineSmall" style={styles.name} numberOfLines={1}>
          {nom || 'Sans nom'}
        </Text>
        {caste || concept ? (
          <View style={styles.chips}>
            <CasteChip caste={caste} tone="overlay" />
            <StatutChip caste={caste} statut={statut} darkOrders={darkOrders} tone="overlay" />
            <ConceptChip concept={concept} tone="overlay" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

// The name is fixed light ink rather than a theme role: it sits on the scrim,
// which is the same dark wash in both themes (see `theme/overlayInk`).
const NAME_COLOR = OVERLAY_INK.text;

const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  // Inlined rather than StyleSheet.absoluteFillObject, which RN 0.85 dropped.
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  avatar: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  rings: { position: 'absolute', top: 12, right: 12 },
  identity: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 8 },
  name: { color: NAME_COLOR },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
