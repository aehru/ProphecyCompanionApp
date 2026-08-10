import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type Href, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Divider, Menu, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useCampaignLive } from '@/hooks/use-campaign-live';

const STATUS_LABEL = {
  online: 'Diffusion en cours',
  connecting: 'Connexion…',
  offline: 'Hors ligne',
} as const;

/**
 * Global live-broadcast indicator: a small pulsing button floating bottom-left,
 * OVERLAYING content (no layout reflow, unlike a banner). Shown on every screen
 * while a campaign is live; tap for the campaign name, status, and a Stop /
 * open-campaign menu. Sits above the bottom tab bar / FABs and is bottom-LEFT to
 * avoid the bottom-right FAB stack. Renders nothing when not live.
 */
export default function CampaignLiveIndicator() {
  const { liveCampaignId, status, campaignName, sharedCount, stop } = useCampaignLive();
  const theme = useProphecyTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Pulse ring only while actually connected; steady (no pulse) otherwise.
  // Lazy useState rather than useRef(...).current: same "create once" semantics,
  // without reading a ref during render (the interpolations below run in render).
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (status !== 'online') {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  if (liveCampaignId == null) return null;

  const ringStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { left: insets.left + 16, bottom: insets.bottom + 76 }]}>
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={
          <Pressable onPress={() => setMenuOpen(true)} accessibilityLabel="Diffusion en direct">
            <Animated.View
              style={[styles.ring, ringStyle, { backgroundColor: theme.colors.primary }]}
            />
            <View style={[styles.btn, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons
                name={status === 'online' ? 'broadcast' : 'broadcast-off'}
                size={22}
                color={theme.colors.onPrimary}
              />
            </View>
          </Pressable>
        }>
        <View style={styles.header}>
          <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
            {campaignName || 'Campagne'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {STATUS_LABEL[status]}
            {sharedCount > 0
              ? ` · ${sharedCount} personnage${sharedCount > 1 ? 's' : ''}`
              : ''}
          </Text>
        </View>
        <Divider />
        <Menu.Item
          leadingIcon="open-in-app"
          title="Ouvrir la campagne"
          onPress={() => {
            setMenuOpen(false);
            router.push(`/campaigns/${liveCampaignId}` as Href);
          }}
        />
        <Menu.Item
          leadingIcon="stop-circle-outline"
          title="Arrêter la diffusion"
          onPress={() => {
            setMenuOpen(false);
            stop();
          }}
        />
      </Menu>
    </View>
  );
}

const SIZE = 48;
const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 1000, elevation: 8 },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
});
