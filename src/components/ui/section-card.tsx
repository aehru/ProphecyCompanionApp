import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function SectionCard({
  title,
  children,
  helper,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  const theme = useProphecyTheme();
  return (
    <Card style={styles.card} mode="contained">
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
            {title}
          </Text>
          {helper ? (
            <Text
              variant="titleSmall"
              style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>
              {helper}
            </Text>
          ) : null}
        </View>
        {children}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12 },
  content: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  helper: { flexShrink: 1, fontSize: 12 },
});
