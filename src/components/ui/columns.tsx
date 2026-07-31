import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useLayout } from '@/hooks/use-layout';

/**
 * Lays a stack of sections out in two columns on a big screen, one on a phone.
 *
 * Sections are *dealt* alternately (even index left, odd right) rather than
 * balanced by height: a true masonry needs a measure pass, and the sheet's
 * sections are close enough in height that dealing reads fine. Order still
 * runs left-to-right, so the first section stays the first thing you see.
 *
 * On one column it renders its children bare, so the parent's `gap` keeps
 * spacing them exactly as before. Pair it with `useSplitWidth()` on the scroll
 * container — two columns need a wider cap than one.
 */
export default function Columns({
  children,
  gap = 12,
}: {
  children: React.ReactNode;
  gap?: number;
}) {
  const { columns } = useLayout();
  if (columns < 2) return <>{children}</>;

  // toArray drops the nulls that conditional sections render, and keys what's left.
  const items = React.Children.toArray(children);
  return (
    <View style={[styles.row, { gap }]}>
      <View style={[styles.col, { gap }]}>{items.filter((_, i) => i % 2 === 0)}</View>
      <View style={[styles.col, { gap }]}>{items.filter((_, i) => i % 2 === 1)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { flex: 1 },
});
