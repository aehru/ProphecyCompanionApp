import { useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import SpellSyncCard, { fillSummary } from '@/components/catalog/spell-sync-card';
import SectionCard from '@/components/ui/section-card';
import { dsIcon } from '@/components/ui/icon';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useSpellSyncPlan } from '@/hooks/use-spell-sync-plan';
import { Alert } from '@/lib/alert';
import { applySpellSync } from '@/repositories/spell-sync';

/**
 * « Mettre à jour depuis le catalogue » — one sweep over every character on the
 * device, propagating rulebook corrections into the spells players already
 * picked.
 *
 * App-wide rather than per character: a correction lands in the catalogue for
 * everyone at once, and a GM holding a dozen NPCs would otherwise walk the same
 * dialog a dozen times. The plan itself is pure (`lib/spell-sync`) and the
 * safety property lives there: a spell with no `presetId` is the player's own
 * writing and is never a candidate.
 *
 * What the screen asks about is only the conflicts. Filling a column the sheet
 * left empty overwrites nothing, so it rides along with the revision stamp
 * without a question — it is listed, not negotiated.
 */
export default function CatalogSyncScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useProphecyTheme();

  // Set here rather than in the root `_layout`: nothing on this screen is
  // played, so the stack's dice button would be noise.
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Mise à jour des sorts', headerRight: () => null });
  }, [navigation]);

  // The same plan the Catalogues banner counts — assembled once, in the hook,
  // so the two can never disagree about how much there is to do.
  const { plan, entries, nameById, loading } = useSpellSyncPlan();

  /** Spell ids whose conflicts the player chose to take from the catalogue. */
  const [accepted, setAccepted] = useState<ReadonlySet<number>>(new Set());
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge">Toutes les fiches sont à jour.</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Aucun sortilège copié du catalogue n’a été corrigé depuis.
        </Text>
      </View>
    );
  }

  const apply = async () => {
    setBusy(true);
    try {
      await applySpellSync(entries, accepted);
      Alert.alert(
        'Mise à jour effectuée',
        `${entries.length} sortilège${entries.length > 1 ? 's' : ''} mis à jour.`,
        [{ text: 'Fermer', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('Mise à jour impossible', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, contentWidth]}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {entries.length} sortilège{entries.length > 1 ? 's' : ''} {plural(entries.length, 'copié')} du
        catalogue {plural(entries.length, 'a', 'ont')} été {plural(entries.length, 'corrigé')} depuis.
        Les sorts que vous avez écrits vous-même ne sont jamais touchés.
      </Text>

      {plan.conflicts.length > 0 ? (
        <SectionCard title="À trancher" icon="magic">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Votre version et celle du catalogue diffèrent. Garder la vôtre est le choix par défaut.
          </Text>
          <View style={styles.cards}>
            {plan.conflicts.map((entry) => (
              <SpellSyncCard
                key={entry.spellId}
                entry={entry}
                characterNom={nameById.get(entry.characterId) ?? ''}
                accepted={accepted.has(entry.spellId)}
                onChange={(take) =>
                  setAccepted((prev) => {
                    const next = new Set(prev);
                    if (take) next.add(entry.spellId);
                    else next.delete(entry.spellId);
                    return next;
                  })
                }
              />
            ))}
          </View>
        </SectionCard>
      ) : null}

      {plan.auto.length > 0 ? (
        <SectionCard title="Sans conflit" icon="scroll">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Rien de votre fiche n’est remplacé : ces sortilèges reçoivent seulement ce qui leur
            manquait.
          </Text>
          {plan.auto.map((entry) => {
            const fills = fillSummary(entry);
            return (
              <Text key={entry.spellId} variant="bodyMedium">
                {entry.name || 'Sortilège'}
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {' · '}
                  {nameById.get(entry.characterId) ?? ''}
                  {fills !== '' ? ` — ${fills}` : ''}
                </Text>
              </Text>
            );
          })}
        </SectionCard>
      ) : null}

      <Button mode="contained" icon={dsIcon('book')} loading={busy} disabled={busy} onPress={apply}>
        Mettre à jour
      </Button>
    </ScrollView>
  );
}

/** Agreement helper — « 3 sortilèges copiés ont été corrigés ». */
function plural(n: number, one: string, many = `${one}s`) {
  return n > 1 ? many : one;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  cards: { gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
});
