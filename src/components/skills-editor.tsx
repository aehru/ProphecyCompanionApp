import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, Divider, IconButton, Menu, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import SkillFilterBar from '@/components/skill-filter-bar';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUTS, ATTRIBUT_LABEL } from '@/constants/prophecy';
import type { Skill } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useSkillFilter } from '@/hooks/use-skill-filter';
import type { SkillRow } from '@/lib/character-values';

/** Seed data for a new specialization: the mother's current name/attribut/value. */
export type SpecMother = { name: string; attribut: string; value: number };

/**
 * Edit a character's skills. Skills are grouped into one tab per attribut to
 * avoid a long scroll; the search bar filters across ALL attributs (global) and
 * overrides the active tab. No match → add a free (custom) skill. Skills left at
 * 0 are not saved.
 *
 * Owns its scroll so the filter bar (+ add button) can float over the top and
 * reveal on scroll-UP (Chrome-bar pattern): scrolling down tucks it away (full
 * viewport for the rows), the first scroll back brings it out — no trip to the
 * top, and no bottom-dock fight with the keyboard avoidance.
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
  rows: SkillRow[];
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

  // --- reveal-on-scroll-up filter bar -------------------------------------
  // The bar floats over the list (absolute, top). Scrolling down slides it out
  // of the way; any scroll back up (or being near the top) slides it back in.
  const [barH, setBarH] = useState(BAR_HEIGHT_GUESS);
  const barHRef = useRef(BAR_HEIGHT_GUESS);
  const barShown = useRef(true);
  const barY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const setBarVisible = useCallback(
    (show: boolean) => {
      if (barShown.current === show) return;
      barShown.current = show;
      Animated.timing(barY, {
        toValue: show ? 0 : -barHRef.current,
        duration: 180,
        useNativeDriver: true,
      }).start();
    },
    [barY],
  );

  const onBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      barHRef.current = h;
      setBarH(h);
      // Height changed while hidden (add button appeared/left): re-tuck fully.
      if (!barShown.current) barY.setValue(-h);
    },
    [barY],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;
      // While searching the bar holds the active input — never tuck it away.
      if (searching || y <= 8) setBarVisible(true);
      else if (dy > 6) setBarVisible(false);
      else if (dy < -6) setBarVisible(true);
    },
    [searching, setBarVisible],
  );

  // Typing can start while the bar is mid-hide (e.g. via a hardware keyboard):
  // a live search always pins the bar.
  useEffect(() => {
    if (searching) setBarVisible(true);
  }, [searching, setBarVisible]);

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

  const specsByMother = new Map<string, Skill[]>();
  for (const s of specs) {
    if (s.parentName) {
      const list = specsByMother.get(s.parentName) ?? [];
      list.push(s);
      specsByMother.set(s.parentName, list);
    }
  }

  // Stable so each NumberField keeps the same onChange identity and its
  // React.memo can skip re-rendering untouched rows. NumberField hands back its
  // fieldKey (the row index as a string).
  const onFieldChange = useCallback(
    (key: string, t: string) => onChangeValue(Number(key), t),
    [onChangeValue],
  );

  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      searching ? row.name.toLowerCase().includes(q) : row.attribut === activeAttr,
    );

  const exactMatch = rows.some((r) => r.name.trim().toLowerCase() === q);
  const canAdd = searching && !exactMatch;

  // Specializations whose mother isn't shown as a base row (mother not in the
  // catalogue and not owned — e.g. a removed custom skill) are grouped under a
  // greyed "non acquise" ghost header so they stay visible and editable.
  const coveredNames = new Set(rows.map((r) => r.name));
  const orphanByMother = new Map<string, Skill[]>();
  for (const s of specs) {
    if (!s.parentName || coveredNames.has(s.parentName)) continue;
    const inTab = searching
      ? s.parentName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      : s.attribut === activeAttr;
    if (!inTab) continue;
    const list = orphanByMother.get(s.parentName) ?? [];
    list.push(s);
    orphanByMother.set(s.parentName, list);
  }
  const orphanGroups = [...orphanByMother.entries()];

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.listContent, { paddingTop: barH }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View style={styles.cardWrap}>
          <SectionCard title={title}>
        {visible.map(({ row, index }, i) => {
          const rowSpecs = specsByMother.get(row.name) ?? [];
          return (
            <View key={`${row.name}-${index}`}>
              {i > 0 && <Divider style={styles.divider} />}
              <View style={styles.row}>
                {/* Leading 3-letter attribut chip = the re-link menu (compact rows). */}
                <Menu
                  visible={menuFor === index}
                  onDismiss={() => setMenuFor(null)}
                  anchor={
                    <Button
                      compact
                      mode="text"
                      onPress={() => setMenuFor(index)}
                      labelStyle={styles.attrLabel}>
                      {(ATTRIBUT_LABEL[row.attribut] ?? '—').slice(0, 3)}
                    </Button>
                  }>
                  {ATTRIBUTS.map((a) => (
                    <Menu.Item
                      key={a.key}
                      title={a.label}
                      onPress={() => {
                        onChangeAttribut(index, a.key);
                        setMenuFor(null);
                      }}
                    />
                  ))}
                </Menu>

                <Text numberOfLines={1} style={styles.nameCol}>
                  {row.name}
                </Text>

                <NumberField
                  fieldKey={String(index)}
                  value={row.value}
                  style={styles.valueField}
                  onChange={onFieldChange}
                  // Only the freshly-added row gets a ref — an inline ref on
                  // every row would defeat NumberField's memo.
                  inputRef={pendingFocus === row.name ? focusNewSkill : undefined}
                />

                {row.isCustom ? (
                  <IconButton
                    icon={dsIcon('close')}
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => onRemove(index)}
                  />
                ) : null}
              </View>

              {rowSpecs.map((spec) => (
                <SpecRow
                  key={spec.id}
                  spec={spec}
                  onLabel={onSpecLabel}
                  onValue={onSpecValue}
                  onRemove={onSpecRemove}
                />
              ))}

              {/* A specialization may be added even without owning the mother
                  (GM's call); it's seeded from the mother's current value (0 if
                  not owned). */}
              <Button
                compact
                mode="text"
                icon={dsIcon('plus')}
                onPress={() =>
                  onAddSpec({
                    name: row.name,
                    attribut: row.attribut,
                    value: parseInt(row.value, 10) || 0,
                  })
                }
                style={styles.addSpec}
                labelStyle={styles.addSpecLabel}>
                Spé
              </Button>
            </View>
          );
        })}

        {orphanGroups.map(([mother, mspecs], gi) => (
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

        {visible.length === 0 && orphanGroups.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {searching ? 'Aucun résultat.' : 'Aucune compétence.'}
          </Text>
        ) : null}
          </SectionCard>
        </View>
      </KeyboardAwareScrollView>

      {/* Floating filter bar — opaque, slides out on scroll-down. */}
      <Animated.View
        onLayout={onBarLayout}
        style={[
          styles.bar,
          { backgroundColor: theme.colors.background, transform: [{ translateY: barY }] },
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

/**
 * One specialization line under its mother. Manages its own debounced local
 * state (like the base rows) so typing the label/value doesn't hammer the DB;
 * the label rename recomputes the composite name + rewrites effect targets in
 * the repository.
 */
function SpecRow({
  spec,
  onLabel,
  onValue,
  onRemove,
}: {
  spec: Skill;
  onLabel: (spec: Skill, label: string) => void;
  onValue: (spec: Skill, value: number) => void;
  onRemove: (spec: Skill) => void;
}) {
  const theme = useProphecyTheme();
  const [label, setLabel] = useDebouncedText(spec.specLabel ?? '', (t) => onLabel(spec, t));
  const [value, setValue] = useDebouncedText(String(spec.value), (t) =>
    onValue(spec, parseInt(t, 10) || 0),
  );

  return (
    <View style={styles.specRow}>
      <Text style={[styles.specArrow, { color: theme.colors.onSurfaceVariant }]}>↳</Text>
      {/* Plain input matching NumberField's box — Paper's outlined field is far
          taller and carries a floating label the compact rows don't need. */}
      <RNTextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Spécialisation"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        style={[
          styles.specInput,
          { borderColor: theme.colors.outline, color: theme.colors.onSurface },
        ]}
      />
      <NumberField
        fieldKey={`spec-${spec.id}`}
        value={value}
        style={styles.valueField}
        onChange={(_, t) => setValue(t)}
      />
      <IconButton
        icon={dsIcon('close')}
        size={20}
        iconColor={theme.colors.error}
        onPress={() => onRemove(spec)}
      />
    </View>
  );
}

/** Pre-layout estimate of the bar height, refined by onLayout on first paint. */
const BAR_HEIGHT_GUESS = 112;

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Top padding comes from the measured bar height (the bar floats above).
  listContent: { paddingBottom: 96 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, paddingBottom: 8, gap: 8 },
  cardWrap: { paddingHorizontal: 12, paddingTop: 4 },
  divider: { marginVertical: 6 },
  // Single line now (attr chip · name · value): center instead of flex-start.
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameCol: { flex: 1 },
  valueField: { flexGrow: 0, flexBasis: 'auto', minWidth: 0, width: 64 },
  attrLabel: { fontSize: 12, marginHorizontal: 0 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, marginTop: 6 },
  specArrow: { fontSize: 16 },
  // Mirror of number-field's input box so the two fields sit flush on the row.
  specInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  ghostHeader: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  addSpec: { alignSelf: 'flex-start', marginTop: 2 },
  addSpecLabel: { fontSize: 12, marginHorizontal: 4 },
});
