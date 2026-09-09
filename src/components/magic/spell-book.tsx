// The Sorts tab's list: a pinned search field over one section per sphère.
//
// A mage's spellbook grows past what a flat list can be scanned for, so the
// same grouping the catalogue uses is applied to what the character owns —
// through the very same `buildSpellSections`, with only the query facet in
// play. The sphères always group; only the search FIELD waits for
// SEARCH_THRESHOLD, since a box to filter four sortilèges is just chrome.

import React, { useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';

import SpellCard from '@/components/spell-card';
import Columns from '@/components/ui/columns';
import Icon from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-card';
import TabPage from '@/components/ui/tab-page';
import { SPHERES } from '@/constants/prophecy';
import type { Spell } from '@/db/schema';
import { useSplitWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SpellReadings } from '@/hooks/use-spell-total';
import { openRoller } from '@/lib/dice-roller';
import { spellRollContext } from '@/lib/roll-context';
import { buildSpellSections, compareSpellEntries, NO_FILTERS } from '@/lib/spell-catalog-filter';
import { foldQuery } from '@/lib/text-fold';

/** Under this many sortilèges the sphère headings are enough — no search field. */
const SEARCH_THRESHOLD = 12;

const NONE_COLLAPSED: ReadonlySet<string> = new Set();

/** Section key for the starred rows. Not a `SphereKey`, so it cannot clash. */
const FAVORITES_KEY = 'favorites';

export default function SpellBook({
  spells,
  readings,
}: {
  /** The spellbook proper — `known` rows only; the caller filters. */
  spells: readonly Spell[];
  /** This character's casting score and stat values. */
  readings: SpellReadings;
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(NONE_COLLAPSED);
  // Re-sectioning is the expensive half of a keystroke; the field stays live.
  const applied = useDeferredValue(query);
  const searching = applied.trim() !== '';
  const splitWidth = useSplitWidth();
  const theme = useProphecyTheme();

  // The shape `buildSpellSections` indexes on. Rebuilt per rows rather than once
  // at module load (unlike the catalogue's): this list is live data.
  const index = useMemo(
    () =>
      spells
        .map((spell) => ({
          spell,
          search: foldQuery(spell.name),
          sortKey: spell.name.toLowerCase(),
          discipline: spell.discipline,
          sphere: spell.sphere,
          level: String(spell.level),
          tags: spell.tags,
        }))
        // Niveau then nom, like the catalogue — insertion order is how they were
        // acquired, which is not how they are looked up.
        .sort(compareSpellEntries),
    [spells],
  );

  // A search that found three sortilèges must not hide them behind a header
  // folded ten minutes ago — so a query suspends the folds rather than clearing
  // them, and they come back when the field does.
  const sections = useMemo(
    () =>
      buildSpellSections(
        index,
        SPHERES,
        { ...NO_FILTERS, query: applied },
        searching ? NONE_COLLAPSED : collapsed,
      ),
    [index, applied, searching, collapsed],
  );

  /**
   * The mage's shortlist, as a section above the sphères — the same sectioner
   * run over the starred rows alone and flattened, so it obeys the search
   * exactly as the sphères do and needs no second filtering rule.
   *
   * The rows also STAY in their sphère below, like the catalogues': moving them
   * out would mean opening « Sphère du Feu » and not finding the spell you
   * starred.
   */
  const favorites = useMemo(() => {
    const starred = index.filter((e) => e.spell.favorite);
    if (starred.length === 0) return [];
    return buildSpellSections(
      starred,
      SPHERES,
      { ...NO_FILTERS, query: applied },
      NONE_COLLAPSED,
    ).flatMap((s) => s.data);
  }, [index, applied]);

  // Folding the only sphère a character knows just hides their whole spellbook.
  // The Favoris block counts as one: with a single sphère it is the only other
  // heading, and folding either is then a real choice.
  const foldable = !searching && sections.length + (favorites.length > 0 ? 1 : 0) > 1;

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const { totalFor, caracValue } = readings;
  const card = (s: Spell) => {
    // Once per card: the badge shows this score and the roll uses it, and the
    // two must not drift apart.
    const total = totalFor(s);
    return (
      <SpellCard
        key={s.id}
        spell={s}
        total={total}
        caracValue={caracValue}
        onRoll={() => openRoller(spellRollContext(s, total))}
      />
    );
  };

  return (
    <View style={styles.root}>
      {/* Outside the TabPage on purpose: the page owns the scroll, so anything
          that must survive scrolling to row 40 has to sit above it. */}
      {spells.length >= SEARCH_THRESHOLD ? (
        <View style={[styles.search, splitWidth]}>
          <Searchbar
            placeholder="Rechercher un sortilège"
            value={query}
            onChangeText={setQuery}
            icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
          />
        </View>
      ) : null}
      <TabPage>
        {favorites.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Favoris"
              icon="star"
              helper={String(favorites.length)}
              expanded={!collapsed.has(FAVORITES_KEY)}
              onPress={foldable ? () => toggle(FAVORITES_KEY) : undefined}
            />
            {collapsed.has(FAVORITES_KEY) && !searching ? null : (
              <Columns gap={10}>{favorites.map((e) => card(e.spell))}</Columns>
            )}
          </View>
        ) : null}

        {sections.length === 0 ? (
          // No sections and no query means an empty spellbook: same branch, and
          // « aucun résultat » would be a lie about a list nobody has filled yet.
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {searching
              ? 'Aucun sortilège ne correspond.'
              : 'Aucun sortilège. Ajoutez-en un avec le bouton « Sort ».'}
          </Text>
        ) : (
          sections.map((s) => (
            <View key={s.key} style={styles.section}>
              <SectionHeader
                title={s.title}
                icon="magic"
                helper={String(s.count)}
                expanded={!collapsed.has(s.key)}
                onPress={foldable ? () => toggle(s.key) : undefined}
              />
              <Columns gap={10}>{s.data.map((e) => card(e.spell))}</Columns>
            </View>
          ))
        )}
      </TabPage>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // paddingBottom left to the TabPage's own paddingTop, so the gap isn't doubled.
  search: { paddingHorizontal: 12, paddingTop: 12 },
  section: { gap: 10 },
});
