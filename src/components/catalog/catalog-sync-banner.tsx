import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import Icon from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { plural } from '@/lib/plural';

/**
 * « 3 sortilèges à mettre à jour » — the way into the catalogue sweep, shown on
 * the Catalogues screen ONLY while there is something to do.
 *
 * A banner and not just a menu entry: a rulebook correction reaches a player at
 * a moment they had no reason to go looking for it, and an action buried in an
 * overflow nobody opens is an action nobody takes. It disappears the instant the
 * sweep has nothing left, so the screen stays as it was the rest of the time.
 */
export default function CatalogSyncBanner({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mettre à jour ${count} ${plural(count, 'sortilège')} depuis le catalogue`}
      style={[
        styles.banner,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
      ]}>
      <Icon name="book" size={20} color={theme.colors.primary} />
      <View style={styles.text}>
        <Text variant="titleSmall">
          {count} {plural(count, 'sortilège')} à mettre à jour
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Le catalogue a changé depuis qu’{plural(count, 'il a', 'ils ont')} été{' '}
          {plural(count, 'copié')} sur une fiche.
        </Text>
      </View>
      <Icon name="chev" size={20} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
  },
  text: { flex: 1, gap: 2 },
});
