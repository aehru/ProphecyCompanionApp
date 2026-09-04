import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';

import ChipSelect, { ChipMultiSelect } from '@/components/ui/chip-select';
import Icon from '@/components/ui/icon';
import SelectField from '@/components/ui/select-field';
import {
  DISCIPLINES,
  SPELL_TAG_GROUP,
  SPELL_TAG_GROUPS,
  SPELL_TAGS,
  SPHERES,
} from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { type SpellFilterCriteria } from '@/lib/spell-catalog-filter';

const DISCIPLINE_OPTIONS = [
  { key: '', label: 'Toutes' },
  ...DISCIPLINES.map((d) => ({ key: d.key, label: d.abbr })),
];

const SPHERE_OPTIONS = [{ key: '', label: 'Toutes' }, ...SPHERES];

/**
 * Tag options per axis, in `SPELL_TAGS` order. Split here rather than in the
 * screen so the three chip groups can never drift from the taxonomy.
 */
const TAG_GROUPS = SPELL_TAG_GROUPS.map((g) => ({
  ...g,
  options: SPELL_TAGS.filter((t) => t.group === g.key).map((t) => ({ key: t.key, label: t.label })),
}));

/**
 * The spell catalogue's whole filter surface: name search, the three always-on
 * facets (sphère / discipline / niveau), and the tag axes behind a « Plus de
 * filtres » disclosure.
 *
 * Rendered in TWO places — the list header and the FAB's dialog — which is
 * exactly why it is a component: a player who scrolled to the bottom gets the
 * same controls, not a reduced copy of them that slowly drifts.
 */
export default function SpellFilterPanel({
  criteria,
  onChange,
  levelOptions,
  autoFocus,
}: {
  criteria: SpellFilterCriteria;
  onChange: (next: SpellFilterCriteria) => void;
  /** Niveaux present in the catalogue, read from the data by the screen. */
  levelOptions: readonly { key: string; label: string }[];
  autoFocus?: boolean;
}) {
  // Open when tags are already narrowing the list, so reopening the panel never
  // hides a filter that is currently in force.
  const [more, setMore] = useState(criteria.tags.length > 0);
  const theme = useProphecyTheme();

  const set = <K extends keyof SpellFilterCriteria>(key: K, value: SpellFilterCriteria[K]) =>
    onChange({ ...criteria, [key]: value });

  // Each group reports only its own keys, so the other axes are carried over by
  // hand — and the result is re-sorted into SPELL_TAGS order so two identical
  // selections always produce the same array.
  const setGroupTags = (groupKey: string, next: readonly string[]) => {
    const kept = criteria.tags.filter((t) => SPELL_TAG_GROUP[t] !== groupKey);
    const merged = new Set([...kept, ...next]);
    set('tags', SPELL_TAGS.filter((t) => merged.has(t.key)).map((t) => t.key));
  };

  return (
    <View style={styles.panel}>
      <Searchbar
        placeholder="Rechercher un sortilège"
        value={criteria.query}
        onChangeText={(v) => set('query', v)}
        autoFocus={autoFocus}
        icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
      />

      {/* Discipline and niveau are few and short — chips, visible at a glance.
          The 9 spheres would be a wall of them, so that one stays a dropdown
          (and doubles as a jump to one section). */}
      <View style={styles.filters}>
        <SelectField
          label="Sphère"
          options={SPHERE_OPTIONS}
          value={criteria.sphere}
          onChange={(v) => set('sphere', v)}
          style={styles.sphereFilter}
          inline
        />
        <View style={styles.disciplineFilter}>
          <ChipSelect
            label="Discipline"
            options={DISCIPLINE_OPTIONS}
            value={criteria.discipline}
            onChange={(v) => set('discipline', v)}
          />
        </View>
        <View style={styles.levelFilter}>
          <ChipSelect
            label="Niveau"
            options={levelOptions}
            value={criteria.level}
            onChange={(v) => set('level', v)}
          />
        </View>
      </View>

      {/* 23 tag chips on three axes would double the header's height for a
          filter most picks don't need — so they fold. */}
      <Pressable
        onPress={() => setMore((m) => !m)}
        accessibilityRole="button"
        accessibilityState={{ expanded: more }}
        style={styles.moreToggle}>
        <View style={more ? styles.chevronOpen : undefined}>
          <Icon name="chev" size={14} color={theme.colors.onSurfaceVariant} />
        </View>
        <Text style={[styles.moreLabel, { color: theme.colors.onSurfaceVariant }]}>
          Plus de filtres
          {criteria.tags.length > 0 ? ` (${criteria.tags.length})` : ''}
        </Text>
      </Pressable>

      {more
        ? TAG_GROUPS.map((g) => (
            <ChipMultiSelect
              key={g.key}
              label={g.label}
              options={g.options}
              values={criteria.tags}
              onChange={(next) => setGroupTags(g.key, next)}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 16 },
  // Wraps to one column on a phone, sits on one line once there is room.
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  sphereFilter: { flexGrow: 1, flexBasis: 140, minWidth: 140 },
  disciplineFilter: { flexGrow: 2, flexBasis: 220, minWidth: 200 },
  levelFilter: { flexGrow: 1, flexBasis: 130, minWidth: 130 },
  moreToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  moreLabel: { fontSize: 12 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
});
