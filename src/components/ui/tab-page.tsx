// One page of a <TabPager>: its own vertical scroll, the standard padding, and
// the content-width cap. The pager only lays pages out side by side — the
// scrolling belongs to each page, so the strip above can stay pinned.

import React from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useSplitWidth } from '@/hooks/use-layout';

export default function TabPage({ children }: { children: React.ReactNode }) {
  const splitWidth = useSplitWidth();
  return (
    <KeyboardAwareScrollView contentContainerStyle={[styles.page, splitWidth]} bottomOffset={24}>
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  // paddingBottom clears the stacked FABs at the bottom right.
  page: { padding: 12, gap: 12, paddingBottom: 160 },
});
