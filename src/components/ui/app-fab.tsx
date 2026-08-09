import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import React from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

type IconSource = NonNullable<React.ComponentProps<typeof FAB>['icon']>;

type AppFabProps = {
  icon: IconSource;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * Extra height for a secondary FAB stacked above the primary one (72 clears a
   * standard FAB + gap). Additive on purpose: a flat `bottom` would drop the
   * safe-area inset and collide with the primary FAB on screens outside the tab
   * navigator, where that inset is applied.
   */
  offset?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * App-wide floating action button. Centralizes position, primary coloring, and
 * safe-area handling so every screen's FAB lines up and clears the onscreen
 * navigation bar / gesture area.
 */
export default function AppFab({ icon, label, onPress, disabled, offset = 0, style }: AppFabProps) {
  const theme = useProphecyTheme();
  const insets = useSafeAreaInsets();
  // Inside a bottom-tab navigator the tab bar already sits above the safe area,
  // so the FAB anchors to the screen above it — adding insets.bottom would
  // double-count and float it too high. Only apply the inset off-tabs.
  const inTabBar = React.useContext(BottomTabBarHeightContext) != null;
  const bottom = 16 + offset + (inTabBar ? 0 : insets.bottom);
  // Paper's FAB props are a union — label-present and label-absent are distinct
  // variants, so branch with inline props instead of passing `label={undefined}`.
  const fabStyle = [styles.fab, { bottom, backgroundColor: theme.colors.primary }, style];
  return label ? (
    <FAB
      icon={icon}
      label={label}
      onPress={onPress}
      disabled={disabled}
      color={theme.colors.onPrimary}
      style={fabStyle}
    />
  ) : (
    <FAB
      icon={icon}
      onPress={onPress}
      disabled={disabled}
      color={theme.colors.onPrimary}
      style={fabStyle}
    />
  );
}

const styles = StyleSheet.create({
  // DS FAB: 18px radius (not a full pill) + a soft gold-ink lift.
  fab: {
    position: 'absolute',
    right: 16,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#2F241A',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
});
