import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import FoldSection from '@/components/ui/fold-section';
import type { IconName } from '@/components/ui/icon';
import { CASTES, type CasteKey } from '@/constants/prophecy';
import { useFolds } from '@/hooks/use-folds';
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
export default function CasteCatalogList<K extends string = CasteKey>({
  icon,
  emptyLabel,
  renderCaste,
  sections = CASTES as unknown as readonly { key: K; label: string }[],
}: {
  icon: IconName;
  /** Shown in a caste's section when `renderCaste` gives nothing back. */
  emptyLabel: string;
  renderCaste: (caste: K) => React.ReactNode | null;
  /** The sections, in order — the castes by default; the Faveurs pass the dragons. */
  sections?: readonly { key: K; label: string }[];
}) {
  const theme = useProphecyTheme();
  const { isOpen, toggle } = useFolds();
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        contentContainerStyle={[styles.container, contentWidth]}>
        {sections.map((c) => {
          const open = isOpen(c.key);
          // A folded caste renders nothing, so its rows are not even built.
          const body = open ? renderCaste(c.key) : null;
          return (
            <FoldSection
              key={c.key}
              title={c.label.toUpperCase()}
              icon={icon}
              open={open}
              onToggle={() => toggle(c.key)}>
              {body ?? (
                <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                  {emptyLabel}
                </Text>
              )}
            </FoldSection>
          );
        })}
      </ScrollView>
    </CatalogScrollProvider>
  );
}

/**
 * A rulebook heading inside one section (« Privilèges annexes », « Actions
 * offensives ») — the one the Privilèges and the manœuvres both print.
 */
export function CatalogFamilyHeading({ label }: { label: string }) {
  const theme = useProphecyTheme();
  return <Text style={[styles.family, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  family: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  empty: { fontStyle: 'italic', fontSize: 13 },
});
