// The generator's controls, and nothing else: every value comes in as a prop and
// every change goes straight back out. Kept apart from the screen so the rolling
// logic and the chip rows can be read (and moved) on their own — a future GM menu
// may host these controls somewhere else entirely.
//
// Every field carries an « i »: the words « Niveau » and « Variation » name
// dials nobody can guess the meaning of, and the explanation belongs next to the
// control rather than in a manual.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import ChipSelect from '@/components/ui/chip-select';
import { dsIcon } from '@/components/ui/icon';
import InfoLabel from '@/components/ui/info-label';
import { archetypeById, ARCHETYPE_CATALOG } from '@/data/archetype-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  clampBatchText,
  MAX_BATCH,
  NPC_TIERS,
  NPC_VARIANCES,
  parseBatch,
  RANDOM_CHOICE,
  type NpcTier,
  type NpcVariance,
} from '@/lib/npc-generator';

const ARCHETYPE_OPTIONS = ARCHETYPE_CATALOG.map((a) => ({ key: a.id, label: a.data.name }));
const TIER_OPTIONS = NPC_TIERS.map((t) => ({ key: t.key, label: t.label }));
const VARIANCE_OPTIONS = NPC_VARIANCES.map((v) => ({ key: v.key, label: v.label }));

const INFO = {
  archetype:
    "Le modèle de départ : une caste, un profil de caractéristiques et une petite liste de " +
    'compétences. Le tirage part de là, il ne part jamais de zéro.',
  option:
    "Un choix propre à l'archétype. La compétence retenue est acquise au meilleur niveau ; " +
    "« Au hasard » laisse le tirage décider, ce qui varie d'un PNJ à l'autre dans un lot.",
  tier:
    'La dangerosité du PNJ. Le niveau décale TOUTES ses caractéristiques et toutes ses ' +
    'compétences : Figurant −1, Standard 0, Élite +1, Légende +2. Les dés d\'initiative et les ' +
    "cases de blessure suivent d'eux-mêmes, puisqu'ils se déduisent des caractéristiques.",
  variance:
    "L'écart autorisé autour de l'archétype. Fixe : les valeurs de l'archétype, deux PNJ du " +
    'même lot sont identiques. Léger : ±1. Chaotique : ±2 sur les caractéristiques (±1 ' +
    'seulement sur les compétences, sinon une compétence à 2 disparaît).',
  count:
    `Combien de PNJ générer d'un coup, jusqu'à ${MAX_BATCH}. Chacun est tiré séparément : ` +
    'noms et valeurs diffèrent. Pour trois gardes identiques, générez-en un et dupliquez-le.',
  name:
    'Laissez vide pour des noms inventés. Sinon, le nom saisi est numéroté : « Garde » donne ' +
    '« Garde #1 », « Garde #2 »… La numérotation reprend au dernier numéro déjà utilisé, ' +
    'donc deux lots de gardes ne se marchent pas dessus.',
} as const;

export default function NpcGeneratorSettings({
  archetypeId,
  tier,
  variance,
  optionChoice,
  countText,
  nameTemplate,
  onArchetype,
  onTier,
  onVariance,
  onOptionChoice,
  onCountText,
  onNameTemplate,
}: {
  archetypeId: string;
  tier: NpcTier;
  variance: NpcVariance;
  optionChoice: string;
  /** Raw text, not a number: a half-typed field must be allowed to be empty. */
  countText: string;
  /** Blank = invented names. Anything else is numbered (« Garde #1 »). */
  nameTemplate: string;
  onArchetype: (id: string) => void;
  onTier: (tier: NpcTier) => void;
  onVariance: (variance: NpcVariance) => void;
  onOptionChoice: (choice: string) => void;
  onCountText: (text: string) => void;
  onNameTemplate: (text: string) => void;
}) {
  const theme = useProphecyTheme();
  const batch = parseBatch(countText);
  const archetype = archetypeById(archetypeId);
  const option = archetype?.data.option ?? null;

  return (
    <View style={styles.root}>
      <ChipSelect
        label="Archétype"
        info={INFO.archetype}
        options={ARCHETYPE_OPTIONS}
        value={archetypeId}
        onChange={onArchetype}
        testIDPrefix="npc-archetype"
      />

      {archetype ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {archetype.data.concept}
        </Text>
      ) : null}

      {option ? (
        <ChipSelect
          label={option.label}
          info={INFO.option}
          options={[
            { key: RANDOM_CHOICE, label: 'Au hasard' },
            ...option.choices.map((c) => ({ key: c, label: c })),
          ]}
          value={optionChoice}
          onChange={onOptionChoice}
        />
      ) : null}

      <ChipSelect
        label="Niveau"
        info={INFO.tier}
        options={TIER_OPTIONS}
        value={tier}
        onChange={(key) => onTier(key as NpcTier)}
        testIDPrefix="npc-tier"
      />
      <ChipSelect
        label="Variation"
        info={INFO.variance}
        options={VARIANCE_OPTIONS}
        value={variance}
        onChange={(key) => onVariance(key as NpcVariance)}
        testIDPrefix="npc-variance"
      />

      {/* Optional: a crowd gets a numbered label, everyone else gets a name the
          generator invents. Placeholder rather than a default value, so the
          empty field reads as « pas de modèle » and not as a suggestion. */}
      <View style={styles.count}>
        <InfoLabel label="Nom (optionnel)" info={INFO.name} testID="npc-name-info" />
        <TextInput
          value={nameTemplate}
          placeholder="Garde"
          testID="field-npc-name"
          onChangeText={onNameTemplate}
        />
      </View>

      {/* A free field rather than a chip row: a GM generating a crowd should not
          be held to the four sizes someone happened to list. The steppers are
          the common case — one more garde, one less — without a keyboard. */}
      <View style={styles.count}>
        <InfoLabel label="Nombre" info={INFO.count} testID="npc-count-info" />
        <View style={styles.countRow}>
          <IconButton
            icon="minus"
            mode="contained"
            size={16}
            // Floored at one: a batch of zero is not a smaller batch, it is
            // nothing to add — and the FAB is already disabled there.
            disabled={batch <= 1}
            accessibilityLabel="Un PNJ de moins"
            testID="npc-count-minus"
            onPress={() => onCountText(String(Math.max(1, batch - 1)))}
          />
          <NumberField
            fieldKey="count"
            value={countText}
            testID="field-npc-count"
            style={styles.countInput}
            onChange={(_key, text) => onCountText(clampBatchText(text))}
          />
          <IconButton
            icon={dsIcon('plus')}
            mode="contained"
            size={16}
            disabled={batch >= MAX_BATCH}
            accessibilityLabel="Un PNJ de plus"
            testID="npc-count-plus"
            onPress={() => onCountText(String(Math.min(MAX_BATCH, batch + 1)))}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  count: { gap: 4 },
  // Wraps rather than squeezes: on a narrow phone the « Relancer » button
  // drops under the stepper instead of shrinking the field to nothing.
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  // NumberField grows to fill its row by default; a batch size is two digits.
  countInput: { flexGrow: 0, flexBasis: 'auto', width: 72 },
});
