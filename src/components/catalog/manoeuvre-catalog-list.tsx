import React, { useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, Searchbar, Text } from 'react-native-paper';

import { CatalogFamilyHeading } from '@/components/catalog/caste-catalog-list';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import ManoeuvreRow from '@/components/manoeuvre/manoeuvre-row';
import FoldSection from '@/components/ui/fold-section';
import Icon, { dsIcon } from '@/components/ui/icon';
import { MANOEUVRE_CONTEXTS, MANOEUVRE_FAMILIES } from '@/constants/prophecy';
import { useCreateManoeuvre } from '@/hooks/use-create-manoeuvre';
import type { Favorites } from '@/hooks/use-favorites';
import { useFolds } from '@/hooks/use-folds';
import { contentWidth } from '@/hooks/use-layout';
import { useManoeuvreCatalog } from '@/hooks/use-manoeuvre-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { buildManoeuvreIndex, groupManoeuvres } from '@/lib/manoeuvre-grouping';
import { foldQuery } from '@/lib/text-fold';

const CONTEXT_LABEL = new Map<string, string>(MANOEUVRE_CONTEXTS.map((c) => [c.key, c.label]));
const FAMILY_LABEL = new Map<string, string>(MANOEUVRE_FAMILIES.map((f) => [f.key, f.label]));

/**
 * The combat manœuvres — searchable, one folding section per part of the combat
 * chapter, the rulebook's headings inside each. Laid out like the weapons'
 * list: a search opens every section, since a query that found three entries
 * must not hide them behind a header folded earlier.
 *
 * Nothing is picked INTO a character: read from one, `favorites` puts the star
 * on each row — that is how a player keeps the ones they use. The device's
 * « Maison » entries sit among the rulebook's, after them in each heading, and
 * the button under the search writes a new one.
 */
export default function ManoeuvreCatalogList({ favorites }: { favorites?: Favorites }) {
  const theme = useProphecyTheme();
  const catalog = useManoeuvreCatalog();
  const create = useCreateManoeuvre();
  const [query, setQuery] = useState('');
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  // Folded per catalogue change (a house entry added), never per keystroke.
  const index = useMemo(() => buildManoeuvreIndex(catalog), [catalog]);
  const applied = useDeferredValue(foldQuery(query));
  const { isOpen, toggle } = useFolds(applied !== '');
  const { groups, total } = useMemo(() => groupManoeuvres(index, applied), [index, applied]);

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        onScroll={onScroll}
        contentContainerStyle={[styles.container, contentWidth]}
        bottomOffset={24}>
        <Searchbar
          placeholder="Rechercher une manœuvre"
          value={query}
          onChangeText={setQuery}
          icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
        />

        <Button mode="outlined" icon={dsIcon('plus')} style={styles.create} onPress={() => create()}>
          Nouvelle manœuvre maison
        </Button>

        {groups.map((g) => (
          <FoldSection
            key={g.contexte}
            title={(CONTEXT_LABEL.get(g.contexte) ?? g.contexte).toUpperCase()}
            icon="sword"
            count={g.count}
            open={isOpen(g.contexte)}
            onToggle={() => toggle(g.contexte)}>
            {g.families.map(({ famille, items }) => (
              <React.Fragment key={famille}>
                <CatalogFamilyHeading label={FAMILY_LABEL.get(famille) ?? famille} />
                {items.map((m) => (
                  <ManoeuvreRow key={m.id} manoeuvre={m} favorites={favorites} />
                ))}
              </React.Fragment>
            ))}
          </FoldSection>
        ))}

        {total === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            Aucune manœuvre ne correspond.
          </Text>
        ) : null}
      </KeyboardAwareScrollView>
    </CatalogScrollProvider>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  create: { alignSelf: 'flex-start' },
  empty: { textAlign: 'center', marginTop: 8 },
});
