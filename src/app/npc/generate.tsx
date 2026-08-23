// « Générer un PNJ » — a screen rather than a dialog, because the result is a
// variable-length list of stat blocks and a capped dialog gave the preview the
// least room on the page. Above 840dp the réglages and the aperçu sit side by
// side; on a phone they stack.
//
// The screen decides nothing about the numbers: everything comes from
// `lib/npc-generator`, and the only state kept here is what the GM chose plus
// the current seed — which is what makes « Relancer » one line.

import { type Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import NpcGeneratorSettings from '@/components/npc-generator/npc-generator-settings';
import NpcPreviewCard from '@/components/npc-generator/npc-preview-card';
import AppFab from '@/components/ui/app-fab';
import Columns from '@/components/ui/columns';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { archetypeById, ARCHETYPE_CATALOG } from '@/data/archetype-catalog';
import { useSplitWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import {
  generateNpcs,
  parseBatch,
  RANDOM_CHOICE,
  type NpcTier,
  type NpcVariance,
} from '@/lib/npc-generator';
import { randomSeed } from '@/lib/rng';
import { characterNames, saveGeneratedNpcs } from '@/repositories/npc-generator';

export default function GenerateNpcScreen() {
  const router = useRouter();
  const theme = useProphecyTheme();
  const splitWidth = useSplitWidth();

  const [archetypeId, setArchetypeId] = useState(ARCHETYPE_CATALOG[0]?.id ?? '');
  const [tier, setTier] = useState<NpcTier>('standard');
  const [variance, setVariance] = useState<NpcVariance>('leger');
  const [optionChoice, setOptionChoice] = useState(RANDOM_CHOICE);
  // Kept as TEXT: the field is free, and a half-typed value has to be allowed
  // to be empty (which reads as zero, i.e. no preview and no way to save).
  const [countText, setCountText] = useState('1');
  // Blank on purpose: no template means the invented names, which is the right
  // default for a PNJ a GM will actually name at the table.
  const [nameTemplate, setNameTemplate] = useState('');
  // A fresh seed per mount — pushing the screen again always rolls anew, with
  // no visible/hidden edge to detect (the dialog needed one).
  const [seed, setSeed] = useState(randomSeed);
  const [taken, setTaken] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // The names already at the table, so the roll can avoid them. Genuinely
  // external (a DB read), hence an effect. A failure is cosmetic — a duplicate
  // name never blocks generating.
  useEffect(() => {
    let cancelled = false;
    characterNames()
      .then((names) => {
        if (!cancelled) setTaken(names);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const count = parseBatch(countText);
  const archetype = archetypeById(archetypeId);
  const preview = archetype
    ? generateNpcs(archetype, count, {
        tier,
        variance,
        optionChoice: optionChoice === RANDOM_CHOICE ? null : optionChoice,
        seed,
        taken,
        nameTemplate,
      })
    : [];

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveGeneratedNpcs(preview);
      // To the character LIST, not back: a batch has no single sheet to land on,
      // and the list is where the PNJs actually appear (it is a live query, so
      // they are already there). `back()` would do it only when the generator was
      // opened from the list, and it is reached from Campagnes now — the GM would
      // return to a screen showing nothing they just made.
      // Cast: see fiche.tsx — the typed-routes generator omits `/` for a root
      // index inside a group.
      router.dismissTo('/' as Href);
    } catch (e) {
      Alert.alert('Génération impossible', e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, splitWidth]}>
        <Columns>
          <SectionCard title="Réglages" icon="dice">
            <NpcGeneratorSettings
              archetypeId={archetypeId}
              tier={tier}
              variance={variance}
              optionChoice={optionChoice}
              countText={countText}
              nameTemplate={nameTemplate}
              onArchetype={(id) => {
                setArchetypeId(id);
                // The previous answer belongs to the previous archetype's question.
                setOptionChoice(RANDOM_CHOICE);
              }}
              onTier={setTier}
              onVariance={setVariance}
              onOptionChoice={setOptionChoice}
              onCountText={setCountText}
              onNameTemplate={setNameTemplate}
            />
          </SectionCard>

          <SectionCard title="Aperçu" icon="character">
            <View style={styles.preview}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Sans équipement ni magie : le PNJ arrive avec ses caractéristiques et ses
                compétences, à compléter sur sa fiche.
              </Text>
              {preview.map((npc) => (
                <NpcPreviewCard key={npc.seed} npc={npc} />
              ))}
            </View>
          </SectionCard>
        </Columns>
      </ScrollView>

      {/* Stacked above the primary, icon-only: same shape as the campaign
          list's scanner and the fiche's effect button. Re-rolling is the action
          a GM repeats until a PNJ reads right, so it belongs under the thumb
          rather than up in the réglages. */}
      <AppFab
        icon={dsIcon('dice')}
        label="Relancer"
        testID="reroll-npc"
        variant="secondary"
        offset={72}
        onPress={() => setSeed(randomSeed())}
      />
      <AppFab
        icon={dsIcon('plus')}
        label={count > 1 ? `Ajouter ${count} PNJ` : 'Ajouter'}
        testID="fab-add-npc"
        disabled={busy || preview.length === 0}
        onPress={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 12, paddingBottom: 160, gap: 16 },
  preview: { gap: 8 },
});
