import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import SpellCatalogList from '@/components/catalog/spell-catalog-list';
import { type SpellPreset } from '@/data/spell-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { log } from '@/lib/log';
import { setEnchantSource } from '@/repositories/enchants';
import { createSpell } from '@/repositories/spells';

/**
 * The source sortilège of one enchantment, picked from the WHOLE catalogue —
 * not from the character's spellbook (that list is right there in the editor).
 *
 * An object is routinely enchanted by somebody else: a character walks into a
 * mage's shop and pays for it. So the picker is deliberately unrestricted, and
 * what it adds is a `known: false` sortilège — recorded because the enchant has
 * to say what was cast into the object, kept out of the spellbook because the
 * character cannot cast it.
 *
 * No `readings` for the same reason: a « Total » here would be THIS character's
 * casting score for a spell they do not know and did not cast. What the
 * enchanter rolled is typed into the editor as a score instead, and the durée
 * stays symbolic until it has one.
 */
export default function EnchantSpellCatalogModal() {
  const numId = useCharacterId();
  const { eid } = useLocalSearchParams<{ eid: string }>();
  const router = useRouter();

  const pick = useCallback(
    async (preset?: SpellPreset) => {
      // Nothing to link for « Sortilège personnalisé »: an enchant with no
      // source is the editor's own free name/effect, already its default.
      if (!preset) {
        router.back();
        return;
      }
      log.info('catalog.add', { entity: 'spells', catalogId: preset.id, reason: 'enchant' });
      // Provenance stamped here like the spellbook's own picker — a sortilège
      // pulled in by an enchant is still a catalogue row, and a later rulebook
      // correction has to be able to find it.
      const spell = await createSpell(numId, {
        ...preset.data,
        presetId: preset.id,
        presetRevision: preset.revision,
        known: false,
      });
      await setEnchantSource(Number(eid), spell);
      router.back();
    },
    [eid, numId, router],
  );

  return (
    <View style={styles.root}>
      <SpellCatalogList onAdd={pick} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
