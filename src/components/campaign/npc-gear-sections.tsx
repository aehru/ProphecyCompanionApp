// What the wire projection cannot carry, for the GM's OWN characters: weapons
// (with their damage formulas resolved), armour, shields and spells.
//
// The projection is deliberately minimal — it is the privacy boundary for a
// PLAYER's character (see lib/character-share.ts). An NPC, though, lives in this
// device's DB, so there is nothing to minimise: the GM gets the real rows and
// the same cards the Fiche uses, damage formulas included. Renders nothing at
// all when the character has no gear and no spells (the common garde case), and
// nothing either when the uuid belongs to a player's character.

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import ArmorCard from '@/components/armor-card';
import Section from '@/components/campaign/sheet-section';
import ShieldCard from '@/components/shield-card';
import SpellCard from '@/components/spell-card';
import WeaponCard from '@/components/weapon-card';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord } from '@/lib/character-values';
import { totalModifier, woundMalus } from '@/lib/modifiers';
import { spellTotal } from '@/lib/spell-total';
import { actualStateQuery } from '@/repositories/actual-state';
import { armorQuery } from '@/repositories/armor';
import { characterByUuidQuery } from '@/repositories/characters';
import { effectsQuery } from '@/repositories/effects';
import { enchantsQuery } from '@/repositories/enchants';
import { shieldsQuery } from '@/repositories/shields';
import { spellsQuery } from '@/repositories/spells';
import { weaponsQuery } from '@/repositories/weapons';

export default function NpcGearSections({ charUuid }: { charUuid: string }) {
  const theme = useProphecyTheme();
  const { data: charRows } = useLiveQuery(characterByUuidQuery(charUuid), [charUuid]);
  const char = charRows?.[0] ?? null;
  // 0 matches nothing — keeps the hook order stable while the character loads
  // (and forever, for a character that only exists on a player's phone).
  const localId = char?.id ?? 0;
  const { data: stateRows } = useLiveQuery(actualStateQuery(localId), [localId]);
  const { data: weapons } = useLiveQuery(weaponsQuery(localId), [localId]);
  const { data: armors } = useLiveQuery(armorQuery(localId), [localId]);
  const { data: shields } = useLiveQuery(shieldsQuery(localId), [localId]);
  const { data: spells } = useLiveQuery(spellsQuery(localId), [localId]);
  const { data: effects } = useLiveQuery(effectsQuery(localId), [localId]);
  const { data: enchants } = useLiveQuery(enchantsQuery(localId), [localId]);

  if (!char) return null;
  const weaponList = weapons ?? [];
  const armorList = armors ?? [];
  const shieldList = shields ?? [];
  const spellList = spells ?? [];
  if (
    weaponList.length === 0 &&
    armorList.length === 0 &&
    shieldList.length === 0 &&
    spellList.length === 0
  ) {
    return null;
  }

  const rec = asNumRecord(char);
  const caracValue = (key: string) => rec[key] ?? 0;
  // Same reading as the Fiche: wound malus + active effects, folded into a carac
  // BEFORE a formula's multiplier — so a damage line shown here is the damage
  // the wounded NPC actually deals.
  const wound = woundMalus(asNumRecord(stateRows?.[0] ?? {}));
  const effectList = effects ?? [];
  const caracModifier = (key: string) => totalModifier(key, effectList, wound);

  const enchantedKeys = new Set((enchants ?? []).map((e) => `${e.targetType}:${e.targetId}`));
  const isEnchanted = (kind: 'weapon' | 'armor' | 'shield', id: number) =>
    enchantedKeys.has(`${kind}:${id}`);

  return (
    <>
      {weaponList.length > 0 ? (
        <Section title="Armes">
          <View style={[styles.list, { borderColor: theme.prophecy.borderSoft }]}>
            {weaponList.map((w) => (
              <WeaponCard
                key={w.id}
                weapon={w}
                caracValue={caracValue}
                caracModifier={caracModifier}
                enchanted={isEnchanted('weapon', w.id)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {armorList.length > 0 ? (
        <Section title="Armures">
          <View style={[styles.list, { borderColor: theme.prophecy.borderSoft }]}>
            {armorList.map((a) => (
              <ArmorCard
                key={a.id}
                armor={a}
                caracValue={caracValue}
                enchanted={isEnchanted('armor', a.id)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {shieldList.length > 0 ? (
        <Section title="Boucliers">
          <View style={[styles.list, { borderColor: theme.prophecy.borderSoft }]}>
            {shieldList.map((s) => (
              <ShieldCard
                key={s.id}
                shield={s}
                caracValue={caracValue}
                caracModifier={caracModifier}
                enchanted={isEnchanted('shield', s.id)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {spellList.length > 0 ? (
        <Section title="Sorts">
          <View style={[styles.list, { borderColor: theme.prophecy.borderSoft }]}>
            {spellList.map((s) => (
              <SpellCard key={s.id} spell={s} total={spellTotal(s, rec, effectList, wound)} />
            ))}
          </View>
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
