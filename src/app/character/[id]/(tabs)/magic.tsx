import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, Dialog, IconButton, Portal, Text, TextInput } from 'react-native-paper';

import Bullets from '@/components/bullets';
import NumberField from '@/components/number-field';
import SpellCard from '@/components/spell-card';
import AppFab from '@/components/ui/app-fab';
import { characterFallback } from '@/components/ui/character-gate';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { DISCIPLINES, SPHERES } from '@/constants/prophecy';
import type { ActualState, MagicReserve } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useEditToggle } from '@/hooks/use-edit-toggle';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, num } from '@/lib/character-values';
import { updateActualState } from '@/repositories/actual-state';
import {
  createMagicReserve,
  deleteMagicReserve,
  magicReservesQuery,
  updateMagicReserve,
} from '@/repositories/magic-reserves';
import { spellsQuery } from '@/repositories/spells';

/**
 * Magie tab — live in-play tracking only. Reserve and spheres are pools whose
 * max lives on the character (set in the sheet form's Magie tab); here the
 * current value is adjusted by tapping bullets, 5 per row. A sphere appears once
 * its max > 0. Disciplines are read-only stats (edited in the form).
 */
export default function CharacterMagicScreen() {
  const numId = useCharacterId();
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useProphecyTheme();
  // ensure: current magic values live on actual_state, edited here.
  const { char, state, setState } = useCharacterState(numId, {
    ensure: true,
    reloadOnFocus: true,
  });
  const { data: spells } = useLiveQuery(spellsQuery(numId), [numId]);
  const { data: reserves } = useLiveQuery(magicReservesQuery(numId), [numId]);
  const [editing, setEditing] = useEditToggle(navigation);
  // Add/edit dialog for reserve objects. `id: null` = creating a new one.
  const [draft, setDraft] = React.useState<{ id: number | null; nom: string; max: string } | null>(
    null,
  );

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);

  // Live writer: update local state immediately, persist in the background.
  const setStateValue = (key: string, value: number) => {
    setState((p) => (p ? ({ ...p, [key]: value } as ActualState) : p));
    updateActualState(numId, { [key]: value } as Partial<ActualState>);
  };

  const dotColor = editing ? theme.colors.primary : theme.colors.onSurfaceVariant;
  const reserveMax = rec.reserveMagiqueMax ?? 0;
  const reserveCur = stRec.reserveMagiqueCurrent ?? 0;
  const knownSpheres = SPHERES.filter((s) => (rec[`${s.key}Max`] ?? 0) > 0);
  const objects: MagicReserve[] = reserves ?? [];

  // Reserve objects: each is its own pool, so saving only writes nom/max —
  // `current` is driven by the bullets (and clamped by the repository).
  const saveDraft = () => {
    if (!draft) return;
    const nom = draft.nom.trim();
    const max = Math.max(0, parseInt(draft.max, 10) || 0);
    if (draft.id == null) createMagicReserve(numId, { nom, max });
    else updateMagicReserve(draft.id, { nom, max });
    setDraft(null);
  };

  const confirmDeleteObject = (o: MagicReserve) =>
    Alert.alert('Supprimer', `Supprimer « ${o.nom.trim() || 'cet objet'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMagicReserve(o.id) },
    ]);

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
        <SectionCard title="DISCIPLINES" icon="book">
          <View style={styles.grid}>
            {DISCIPLINES.map((d) => (
              <StatChip key={d.key} label={d.label} value={num(rec[d.key])} />
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="RÉSERVE"
          icon="magic">
          <View style={styles.sphereRow}>
            <Text style={styles.sphereLabel}>Globale</Text>
            <Bullets
              count={reserveMax}
              filled={reserveCur}
              perRow={5}
              color={dotColor}
              size={18}
              gap={6}
              onSet={editing ? (n) => setStateValue('reserveMagiqueCurrent', n) : undefined}
            />
          </View>

          {knownSpheres.map((s) => {
            const curKey = `${s.key}Current`;
            return (
              <View
                key={s.key}
                style={[
                  styles.sphereRow,
                  styles.sphereDivider,
                  { borderTopColor: theme.colors.outlineVariant },
                ]}>
                <Text style={styles.sphereLabel}>{s.label}</Text>
                <Bullets
                  count={rec[`${s.key}Max`] ?? 0}
                  filled={stRec[curKey] ?? 0}
                  perRow={5}
                  color={dotColor}
                  size={18}
                  gap={6}
                  onSet={editing ? (n) => setStateValue(curKey, n) : undefined}
                />
              </View>
            );
          })}
        </SectionCard>

        {/* Gear, not everyone's business: the section only exists once the
            character owns an object — or while editing, to add the first one. */}
        {objects.length === 0 && !editing ? null : (
          <SectionCard title="OBJETS DE RÉSERVE" icon="magic">
            {objects.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Aucun objet. Ajoutez-en un ci-dessous.
              </Text>
            ) : (
              objects.map((o) => (
                <View
                  key={o.id}
                  style={[
                    styles.sphereRow,
                    styles.objectRow,
                    { borderBottomColor: theme.prophecy.borderSoft },
                  ]}>
                  <Pressable
                    style={styles.objectLabel}
                    disabled={!editing}
                    onPress={() => setDraft({ id: o.id, nom: o.nom, max: String(o.max) })}>
                    <Text style={styles.sphereLabel}>{o.nom.trim() || 'Objet'}</Text>
                    {editing ? (
                      <Text style={[styles.objectHint, { color: theme.colors.onSurfaceVariant }]}>
                        Modifier
                      </Text>
                    ) : null}
                  </Pressable>
                  <Bullets
                    count={o.max}
                    filled={o.current}
                    perRow={5}
                    color={dotColor}
                    size={18}
                    gap={6}
                    style={styles.objectBullets}
                    onSet={editing ? (n) => updateMagicReserve(o.id, { current: n }) : undefined}
                  />
                  {editing ? (
                    <IconButton
                      icon="delete"
                      size={18}
                      iconColor={theme.colors.error}
                      onPress={() => confirmDeleteObject(o)}
                    />
                  ) : null}
                </View>
              ))
            )}

            {editing ? (
              <Button
                mode="outlined"
                icon={dsIcon('plus')}
                onPress={() => setDraft({ id: null, nom: '', max: '3' })}>
                Ajouter un objet
              </Button>
            ) : null}
          </SectionCard>
        )}

        <SectionCard title="SORTILÈGES" icon="magic">
          {(spells ?? []).length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Aucun sortilège. Ajoutez-en un avec le bouton « Sort ».
            </Text>
          ) : (
            (spells ?? []).map((sp) => <SpellCard key={sp.id} spell={sp} />)
          )}
        </SectionCard>
      </KeyboardAwareScrollView>

      <AppFab
        icon={dsIcon('magic')}
        onPress={() => router.push(`/character/${numId}/spell/catalog`)}
        offset={72}
      />
      <AppFab icon={editing ? dsIcon('check') : dsIcon('edit')} onPress={() => setEditing((e) => !e)} />

      <Portal>
        <Dialog
          visible={draft !== null}
          onDismiss={() => setDraft(null)}
          style={[styles.dialog, { borderColor: theme.prophecy.border }]}>
          <Dialog.Title>{draft?.id == null ? 'Nouvel objet' : 'Modifier l’objet'}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Nom de l’objet"
              value={draft?.nom ?? ''}
              onChangeText={(t) => setDraft((d) => (d ? { ...d, nom: t } : d))}
            />
            <NumberField
              fieldKey="max"
              label="Puces de magie"
              value={draft?.max ?? ''}
              onChange={(_, t) => setDraft((d) => (d ? { ...d, max: t } : d))}
              style={styles.maxField}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDraft(null)}>Annuler</Button>
            <Button
              mode="contained"
              icon={dsIcon(draft?.id == null ? 'plus' : 'check')}
              onPress={saveDraft}
              disabled={!draft?.nom.trim()}>
              {draft?.id == null ? 'Ajouter' : 'Enregistrer'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 160 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  sphereRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sphereDivider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  sphereLabel: { width: 72, fontSize: 15, lineHeight: 16 },
  // Reserve objects: name column keeps the sphere alignment, bullets take the
  // rest so the delete button stays pinned right. Bottom hairline like the DS
  // inventory rows (spell/weapon/armor cards), not the sphere top divider.
  objectRow: { alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
  objectLabel: { width: 72 },
  objectHint: { fontSize: 11 },
  objectBullets: { flex: 1 },
  // DS dialog surface (same as the campaigns dialogs / dice roller): tighter
  // radius + a 1px gold hairline (Paper's default Dialog corner balloons and
  // has no border).
  dialog: { borderRadius: 18, borderWidth: 1 },
  dialogContent: { gap: 16 },
  maxField: { flexGrow: 0, flexBasis: 110 },
});
