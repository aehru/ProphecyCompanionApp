import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import Icon from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useTips } from '@/hooks/use-tips';
import { nextTip, type TipScreen, tipsLeft } from '@/lib/tips';

/**
 * The « Astuce » of `screen` this device has not dismissed yet (lib/tips), as a
 * card in the flow of the page — not an overlay, so it never covers a control
 * and needs no layout knowledge. Renders nothing once all are seen. A screen
 * with several tips walks them with « Suivant »; ✕ and « Suivant » both mark the
 * current one seen, so ✕ is « later », not « never » for the rest.
 */
export default function TipCard({ screen }: { screen: TipScreen }) {
  const theme = useProphecyTheme();
  const { seen, loaded, dismiss } = useTips();
  const tip = loaded ? nextTip(screen, seen) : null;
  if (!tip) return null;
  const more = tipsLeft(screen, seen) > 1;

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.border },
      ]}>
      <View style={styles.head}>
        <Icon name="compass" size={18} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.primary }]}>{tip.title}</Text>
        <IconButton
          icon="close"
          size={18}
          style={styles.close}
          accessibilityLabel="Masquer l'astuce"
          onPress={() => dismiss(tip.id)}
        />
      </View>
      <Text style={{ color: theme.colors.onSurface }}>{tip.body}</Text>
      {more ? (
        <Button compact style={styles.next} onPress={() => dismiss(tip.id)}>
          Suivant
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, paddingLeft: 14, paddingRight: 4, paddingVertical: 8, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: 'Cinzel_600SemiBold' },
  close: { margin: 0 },
  next: { alignSelf: 'flex-end' },
});
