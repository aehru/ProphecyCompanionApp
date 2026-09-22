import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import SectionCard from '@/components/ui/section-card';
import type { IconName } from '@/components/ui/icon';
import { CASTES, type CasteKey } from '@/constants/prophecy';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The page shell the caste-keyed catalogues share: one section per caste, in the
 * fixed order of `CASTES`, inside a scroll that collapsing rows can drive.
 *
 * Two of them today — the Statut ladders and the Privilèges. Neither has a
 * search or an `onAdd`, because neither is picked FROM: a Statut is a number on
 * the sheet and a privilège is bought out of a budget the sheet does not model
 * yet. What is left after that is the same twenty lines twice, which is what
 * lives here.
 *
 * `renderCaste` returns null for a caste the catalogue does not carry, and the
 * shell prints `emptyLabel` in its place — a section nobody has filled in and a
 * section with nothing in it are different answers, and only the caller knows
 * which of the two it is.
 */
export default function CasteCatalogList({
  icon,
  emptyLabel,
  renderCaste,
}: {
  icon: IconName;
  /** Shown in a caste's section when `renderCaste` gives nothing back. */
  emptyLabel: string;
  renderCaste: (caste: CasteKey) => React.ReactNode | null;
}) {
  const theme = useProphecyTheme();
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        contentContainerStyle={[styles.container, contentWidth]}>
        {CASTES.map((c) => {
          const body = renderCaste(c.key);
          return (
            <SectionCard key={c.key} title={c.label.toUpperCase()} icon={icon}>
              {body ?? (
                <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                  {emptyLabel}
                </Text>
              )}
            </SectionCard>
          );
        })}
      </ScrollView>
    </CatalogScrollProvider>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  empty: { fontStyle: 'italic', fontSize: 13 },
});
