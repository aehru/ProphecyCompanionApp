import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import StatutDetail from '@/components/statut-detail';
import SectionCard from '@/components/ui/section-card';
import { CASTES } from '@/constants/prophecy';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { rungLabel, statutsForCaste } from '@/lib/statut';

/**
 * The Statut ladders, read outside any character — one section per caste, five
 * rungs each. No search and no `onAdd`, unlike the other catalogues: forty
 * entries in a fixed order fit on a scroll, and a Statut is never picked from
 * here (it is a number on the sheet, set on the Identité form).
 *
 * A caste whose ladder is not typed in yet says so rather than rendering an
 * empty card — a section nobody has filled in and a section with nothing to show
 * are different answers, the same distinction the avantages catalogue draws.
 */
export default function StatusCatalogList() {
  const theme = useProphecyTheme();
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        contentContainerStyle={[styles.container, contentWidth]}>
        {CASTES.map((c) => {
          const ladder = statutsForCaste(c.key);
          return (
            <SectionCard key={c.key} title={c.label.toUpperCase()} icon="compass">
              {ladder.length === 0 ? (
                <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                  Statuts pas encore saisis.
                </Text>
              ) : (
                ladder.map((rung) => (
                  <CatalogRow
                    key={rung.niveau}
                    icon="compass"
                    name={rungLabel(rung)}
                    subtitle={rung.technique?.nom}>
                    <StatutDetail rung={rung} />
                  </CatalogRow>
                ))
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
