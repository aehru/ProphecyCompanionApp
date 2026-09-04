// One enchant row: name/target summary (tap → full editor), a current/max charge
// stepper (editing-gated, mirrors ResourcesSection's Chance/Maîtrise controls),
// and — only when `sourceSpellId` still resolves to a real spell — a toggle that
// expands the same read-only SpellDetail used by SpellCard, inline rather than
// as a popup/modal.

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';

import EnchantScoreSummary from '@/components/magic/enchant-score-summary';
import SpellDetail from '@/components/spell-detail';
import { dsIcon } from '@/components/ui/icon';
import type { Armor, Enchant, Item, Shield, Spell, Weapon } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { ENCHANT_TARGET_LABEL } from '@/lib/enchant-targets';
import { updateEnchant } from '@/repositories/enchants';

export default function EnchantRow({
  enchant: e,
  target,
  equipped,
  editing,
  spells,
  onOpen,
}: {
  enchant: Enchant;
  target: Weapon | Armor | Shield | Item | undefined;
  equipped: boolean;
  editing: boolean;
  spells: Spell[];
  onOpen: () => void;
}) {
  const theme = useProphecyTheme();
  const [showSpell, setShowSpell] = useState(false);
  const linkedSpell = e.sourceSpellId != null ? spells.find((s) => s.id === e.sourceSpellId) : undefined;

  return (
    <View style={[styles.enchantCard, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <View style={styles.enchantHeader}>
        <Pressable style={styles.enchantRow} onPress={onOpen}>
          <View style={styles.enchantLabel}>
            <Text style={styles.enchantName} numberOfLines={1}>
              {e.name.trim() || 'Enchantement'}
            </Text>
            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              {target?.name.trim() || '?'} · {ENCHANT_TARGET_LABEL[e.targetType]}
              {!equipped ? ' · non équipé' : ''}
            </Text>
            {e.sourceSpellName ? (
              <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
                D’après : {e.sourceSpellName}
                {linkedSpell && !linkedSpell.known ? ' · lancé par un autre mage' : ''}
              </Text>
            ) : null}
            {/* The enchanter's roll, right under the name: it is what the object
                does, and it is fixed for good. */}
            <EnchantScoreSummary enchant={e} spell={linkedSpell} />
          </View>
          <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
        </Pressable>
        {linkedSpell ? (
          <IconButton
            icon={showSpell ? 'chevron-up' : dsIcon('magic')}
            size={18}
            onPress={() => setShowSpell((v) => !v)}
          />
        ) : null}
      </View>

      <View style={styles.usesRow}>
        <Text style={styles.usesLabel}>Utilisations</Text>
        {editing ? (
          <IconButton
            icon="minus"
            mode="contained"
            size={16}
            disabled={e.usesCurrent <= 0}
            onPress={() => updateEnchant(e.id, { usesCurrent: Math.max(0, e.usesCurrent - 1) })}
          />
        ) : null}
        <Text style={styles.usesCount}>
          {e.usesCurrent} / {e.usesMax}
        </Text>
        {editing ? (
          <IconButton
            icon={dsIcon('plus')}
            mode="contained"
            size={16}
            disabled={e.usesCurrent >= e.usesMax}
            onPress={() => updateEnchant(e.id, { usesCurrent: Math.min(e.usesMax, e.usesCurrent + 1) })}
          />
        ) : null}
      </View>

      {showSpell && linkedSpell ? <SpellDetail spell={linkedSpell} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Enchant rows stack (name/target header, then a uses stepper, then an
  // optional inline spell view) rather than sitting beside bullets like a
  // reserve object, so they get their own vertical container.
  enchantCard: { paddingVertical: 6, borderBottomWidth: 1, gap: 6 },
  enchantHeader: { flexDirection: 'row', alignItems: 'center' },
  enchantRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  enchantLabel: { flex: 1, minWidth: 0 },
  enchantName: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 11 },
  usesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usesLabel: { flex: 1, fontSize: 15 },
  usesCount: { minWidth: 56, textAlign: 'center', fontSize: 15 },
});
