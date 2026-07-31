import React, { useCallback, useState } from 'react';
import { Animated, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, Divider, Text } from 'react-native-paper';

import SkillFilterBar from '@/components/skill-filter-bar';
import SkillRow, { type SpecMother } from '@/components/skills/skill-row';
import SpecRow from '@/components/skills/spec-row';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import type { Skill } from '@/db/schema';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useRevealOnScroll } from '@/hooks/use-reveal-on-scroll';
import { useSkillFilter } from '@/hooks/use-skill-filter';
import type { SkillRow as SkillRowData } from '@/lib/character-values';
import { groupSpecsByMother, orphanGroups, visibleRows } from '@/lib/skill-grouping';

export type { SpecMother };

/** Pre-layout estimate of the bar height, refined by onLayout on first paint. */
const BAR_HEIGHT_GUESS = 112;

/**
 * Edit a character's skills. Skills are grouped into one tab per attribut to
 * avoid a long scroll; the search bar filters across ALL attributs (global) and
 * overrides the active tab. No match → add a free (custom) skill. Skills left at
 * 0 are not saved.
 *
 * Owns its scroll so the filter bar (+ add button) can float over the top and
 * reveal on scroll-UP (see use-reveal-on-scroll).
 */
export default function SkillsEditor({
  rows,
  specs,
  search,
  onSearch,
  onChangeValue,
  onChangeAttribut,
  onAddCustom,
  onRemove,
  onAddSpec,
  onSpecLabel,
  onSpecValue,
  onSpecRemove,
}: {
  rows: SkillRowData[];
  // Live specialization rows (parentName set); grouped under their mother.
  specs: Skill[];
  search: string;
  onSearch: (t: string) => void;
  onChangeValue: (index: number, t: string) => void;
  onChangeAttribut: (index: number, attribut: string) => void;
  onAddCustom: (name: string, attribut: string) => void;
  onRemove: (index: number) => void;
  onAddSpec: (mother: SpecMother) => void;
  onSpecLabel: (spec: Skill, label: string) => void;
  onSpecValue: (spec: Skill, value: number) => void;
  onSpecRemove: (spec: Skill) => void;
}) {
  const theme = useProphecyTheme();
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const { activeAttr, setActiveAttr, q, searching, title } = useSkillFilter({
    value: search,
    onChange: onSearch,
  });
  // While searching the bar holds the active input — it must never tuck away.
  const bar = useRevealOnScroll({ height: BAR_HEIGHT_GUESS, pinned: searching });

  // A just-added custom skill: its value field grabs focus when its row mounts
  // (the add clears the search, so the row appears in the active tab), letting
  // the user type the value right away (#50).
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const focusNewSkill = useCallback((el: RNTextInput | null) => {
    if (el) {
      // Deferred a frame: focusing during the mount commit can be swallowed
      // while the keyboard is re-anchoring from the search field on Android.
      requestAnimationFrame(() => el.focus());
      setPendingFocus(null);
    }
  }, []);

  // Stable so each NumberField keeps the same onChange identity and its
  // React.memo can skip re-rendering untouched rows. NumberField hands back its
  // fieldKey (the row index as a string).
  const onFieldChange = useCallback(
    (key: string, t: string) => onChangeValue(Number(key), t),
    [onChangeValue],
  );

  const scope = { searching, query: q, activeAttr };
  const specsByMother = groupSpecsByMother(specs);
  const visible = visibleRows(rows, scope);
  const orphans = orphanGroups(rows, specs, scope);

  const exactMatch = rows.some((r) => r.name.trim().toLowerCase() === q);
  const canAdd = searching && !exactMatch;

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.listContent, { paddingTop: bar.barHeight }, contentWidth]}
        onScroll={bar.onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View style={styles.cardWrap}>
          <SectionCard title={title}>
            {visible.map(({ row, index }, i) => (
              <View key={`${row.name}-${index}`}>
                {i > 0 && <Divider style={styles.divider} />}
                <SkillRow
                  row={row}
                  index={index}
                  specs={specsByMother.get(row.name) ?? []}
                  menuOpen={menuFor === index}
                  onOpenMenu={() => setMenuFor(index)}
                  onCloseMenu={() => setMenuFor(null)}
                  onChangeValue={onFieldChange}
                  onChangeAttribut={onChangeAttribut}
                  onRemove={onRemove}
                  onAddSpec={onAddSpec}
                  onSpecLabel={onSpecLabel}
                  onSpecValue={onSpecValue}
                  onSpecRemove={onSpecRemove}
                  inputRef={pendingFocus === row.name ? focusNewSkill : undefined}
                />
              </View>
            ))}

            {orphans.map(([mother, mspecs], gi) => (
              <View key={`ghost-${mother}`}>
                {(visible.length > 0 || gi > 0) && <Divider style={styles.divider} />}
                <Text style={[styles.ghostHeader, { color: theme.colors.onSurfaceVariant }]}>
                  {mother} · non acquise
                </Text>
                {mspecs.map((spec) => (
                  <SpecRow
                    key={spec.id}
                    spec={spec}
                    onLabel={onSpecLabel}
                    onValue={onSpecValue}
                    onRemove={onSpecRemove}
                  />
                ))}
              </View>
            ))}

            {visible.length === 0 && orphans.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {searching ? 'Aucun résultat.' : 'Aucune compétence.'}
              </Text>
            ) : null}
          </SectionCard>
        </View>
      </KeyboardAwareScrollView>

      {/* Floating filter bar — opaque, slides out on scroll-down. */}
      <Animated.View
        onLayout={bar.onLayout}
        style={[
          styles.bar,
          { backgroundColor: theme.colors.background, transform: [{ translateY: bar.translateY }] },
        ]}>
        <SkillFilterBar
          search={search}
          onSearch={onSearch}
          activeAttr={activeAttr}
          onAttr={setActiveAttr}
        />

        {canAdd ? (
          <Button
            icon={dsIcon('plus')}
            mode="outlined"
            onPress={() => {
              const name = search.trim();
              // The active tab, not ATTRIBUTS[0]: the new skill lands where the
              // user is working (they can still re-link it via the row menu, #50).
              onAddCustom(name, activeAttr);
              setPendingFocus(name);
            }}>
            Ajouter « {search.trim()} »
          </Button>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Top padding comes from the measured bar height (the bar floats above).
  listContent: { paddingBottom: 96 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, paddingBottom: 8, gap: 8 },
  cardWrap: { paddingHorizontal: 12, paddingTop: 4 },
  divider: { marginVertical: 6 },
  ghostHeader: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
});
