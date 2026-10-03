import { type Href, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';

import AppFab from '@/components/ui/app-fab';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { useAppDragon } from '@/hooks/use-app-dragon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { DragonAccents, type DragonKey } from '@/theme/dragonsTheme';
import { ProphecyDarkTheme, ProphecyLightTheme } from '@/theme/prophecyTheme';

/**
 * « Apparence » — the app-wide accent: the DS gold, or one of the nine Great
 * Dragons. Only the primary family changes; parchment and slate stay.
 */
export default function AppearanceScreen() {
  const theme = useProphecyTheme();
  const { dragon, setDragon } = useAppDragon();
  const router = useRouter();
  const gold = (theme.dark ? ProphecyDarkTheme : ProphecyLightTheme).colors.primary;

  return (
    <>
      <ScrollView contentContainerStyle={[styles.content, contentWidth]}>
        <SectionCard title="Couleur d'accent" icon="dragon">
          <AccentRow
            title="Prophecy"
            description="Parchemin et or"
            color={gold}
            selected={dragon === null}
            onPress={() => setDragon(null)}
          />
          {(Object.keys(DragonAccents) as DragonKey[]).map((key) => {
            const accent = DragonAccents[key];
            return (
              <AccentRow
                key={key}
                title={accent.name}
                description={accent.domain}
                color={(theme.dark ? accent.dark : accent.light).primary}
                selected={dragon === key}
                onPress={() => setDragon(key)}
              />
            );
          })}
        </SectionCard>
      </ScrollView>
      {/* Doubles as the preview: the FAB is the most saturated use of the
          accent, and the choice is already live — so it just goes home. */}
      <AppFab icon={dsIcon('check')} onPress={() => router.dismissTo('/' as Href)} />
    </>
  );
}

function AccentRow({
  title,
  description,
  color,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <List.Item
      title={title}
      description={description}
      titleStyle={{ color: theme.colors.onSurface }}
      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
      left={() => <View style={[styles.swatch, { backgroundColor: color }]} />}
      right={(p) =>
        selected ? <List.Icon {...p} icon="check" color={theme.colors.primary} /> : null
      }
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  // Bottom padding clears the FAB.
  content: { padding: 16, paddingBottom: 96, gap: 24 },
  swatch: { width: 28, height: 28, borderRadius: 14, alignSelf: 'center', marginLeft: 8 },
});
