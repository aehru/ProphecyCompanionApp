import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import {
  CLE_PARFAITE_BONUS,
  SPELL_TAG_LABEL,
  SPHERE_LABEL,
  TIME_UNIT_LABEL,
  timeUnitLabel,
} from '@/constants/prophecy';
import type { Spell } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { spellFormulaResult } from '@/lib/formula';
import { spellTotalBreakdown, type SpellTotal, type SpellTotalInput } from '@/lib/spell-total';

/**
 * The spell fields the detail prints. Every one is optional because the same
 * view renders a **catalogue preset** (`SpellPreset['data']`, whose columns are
 * insert-optional) as well as a saved row.
 */
export type SpellView = Partial<
  Pick<
    Spell,
    | 'level'
    | 'complexity'
    | 'discipline'
    | 'sphere'
    | 'cost'
    | 'castTimeAmount'
    | 'castTimeUnit'
    | 'difficulty'
    | 'cleParfaite'
    | 'cle'
    | 'effect'
    | 'inGameEffect'
    | 'sensoryEffect'
    | 'duration'
    | 'durationUnit'
    | 'targets'
    | 'tags'
  >
>;

/**
 * Read-only spell detail rows — extracted out of SpellCard's own expand so
 * anything that links to a spell (e.g. an enchant's "voir le sort", or the
 * catalogue's preview) can embed the same view inline, without a popup/modal.
 * Pass `onEdit` to add a "Modifier" button (SpellCard does); omit it for a pure
 * view. `total` is the character's casting score (see lib/spell-total); omit it
 * where there is no character in context and the row is skipped.
 *
 * The extracted fields (`inGameEffect`, `sensoryEffect`, durée, cibles, tags)
 * are all optional — the catalogue is being filled one rulebook at a time. A
 * spell carrying none of them renders exactly the single « Effet » row it
 * always did.
 */
export default function SpellDetail({
  spell: s,
  total,
  onEdit,
}: {
  spell: SpellView;
  total?: SpellTotal | null;
  onEdit?: () => void;
}) {
  // A crafted clé parfaite makes the spell easier to cast: the roll gains
  // CLE_PARFAITE_BONUS, which reads here as that much off the difficulty.
  const base = s.difficulty ?? 0;
  const difficulty = s.cleParfaite ? `${base - CLE_PARFAITE_BONUS} (base ${base})` : String(base);
  const sphere = s.sphere ?? '';
  const unit = s.castTimeUnit ?? '';
  const cle = (s.cle ?? '').trim();
  const effect = (s.effect ?? '').trim();
  const inGameEffect = (s.inGameEffect ?? '').trim();
  const sensoryEffect = (s.sensoryEffect ?? '').trim();
  const duration = (s.duration ?? '').trim();
  const targets = (s.targets ?? '').trim();
  const tags = s.tags ?? [];

  // SPHERE resolves right here — `total.sphere` IS the character's score in the
  // spell's own sphere, which is the only one the catalogue ever scales off. NR
  // stays symbolic: it belongs to a cast, not to the spell, and the future
  // "Lancer le sort" flow is what will pass it. So a durée reads « Sphère tours »
  // with no character in context and « 6 tours » on a sheet.
  const sphereValue = total
    ? (key: string | null) => (key == null ? total.sphere : null)
    : undefined;
  const durationValue = spellFormulaResult(duration, { sphere: sphereValue });
  const targetsValue = spellFormulaResult(targets, { sphere: sphereValue });

  return (
    <View style={styles.detail}>
      <DetailRow label="Niveau" value={String(s.level ?? 0)} />
      <DetailRow label="Complexité" value={String(s.complexity ?? 0)} />
      <DetailRow label="Sphère" value={SPHERE_LABEL[sphere] ?? sphere} />
      <DetailRow label="Coût" value={String(s.cost ?? 0)} />
      <DetailRow
        label="Incantation"
        value={`${s.castTimeAmount ?? 0} ${TIME_UNIT_LABEL[unit] ?? unit}`}
      />
      <DetailRow label="Difficulté" value={difficulty} />
      {total ? (
        <TotalRow
          total={total}
          spell={{ discipline: s.discipline ?? '', sphere, cleParfaite: s.cleParfaite }}
        />
      ) : null}
      {durationValue ? (
        <DetailRow
          label="Durée"
          // The unit agrees with the amount once the formula resolved to a plain
          // number; while any variable is still symbolic there is nothing to
          // agree with, so it reads as a plural — « 1 + NR jours ».
          value={`${durationValue} ${timeUnitLabel(s.durationUnit ?? '', Number(durationValue) || null)}`}
        />
      ) : null}
      {targetsValue ? <DetailRow label="Cibles" value={targetsValue} /> : null}
      {cle !== '' ? <DetailRow label="Clé" value={cle} /> : null}

      {/* The mechanical half first — it is what a player checks mid-turn. The
          rulebook paragraph stays below it, always, as the source of truth. */}
      {inGameEffect !== '' ? <Section title="Effet de jeu" body={inGameEffect} /> : null}
      {sensoryEffect !== '' ? <Section title="Ce que l'on perçoit" body={sensoryEffect} /> : null}
      {effect !== '' ? (
        inGameEffect === '' ? (
          // Nothing was extracted for this spell: fall back to the one row this
          // view has always shown.
          <DetailRow label="Effet" value={effect} />
        ) : (
          <Section title="Texte du livre" body={effect} muted />
        )
      ) : null}

      {tags.length > 0 ? <TagRow tags={tags} /> : null}

      {onEdit ? (
        <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
          Modifier
        </Button>
      ) : null}
    </View>
  );
}

/** A titled block of prose — one of the extracted halves of `effect`. */
function Section({ title, body, muted = false }: { title: string; body: string; muted?: boolean }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
      <Text style={[styles.sectionBody, muted ? { color: theme.colors.onSurfaceVariant } : null]}>
        {body}
      </Text>
    </View>
  );
}

/** What the spell DOES, as read-only chips — the catalogue filter's vocabulary. */
function TagRow({ tags }: { tags: string[] }) {
  return (
    <View style={styles.tags}>
      {tags.map((t) => (
        <Chip key={t} compact mode="outlined">
          {SPELL_TAG_LABEL[t] ?? t}
        </Chip>
      ))}
    </View>
  );
}

/**
 * The casting score, with its terms spelled out underneath — the clé parfaite
 * appears here as a `+5` AND above as a lowered difficulty, which is the same
 * bonus read from either side of the roll.
 */
function TotalRow({ total, spell }: { total: SpellTotal; spell: SpellTotalInput }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Total</Text>
      <View style={styles.totalCol}>
        <Text style={[styles.totalValue, { color: theme.colors.primary }]}>{total.total}</Text>
        <Text style={[styles.breakdown, { color: theme.colors.onSurfaceVariant }]}>
          {spellTotalBreakdown(total, spell)}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detail: { gap: 8, paddingLeft: 2, paddingBottom: 12 },
  detailEdit: { alignSelf: 'flex-start', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 92, fontSize: 14 },
  value: { flex: 1, fontSize: 15 },
  totalCol: { flex: 1 },
  totalValue: { fontSize: 15, fontWeight: '600' },
  breakdown: { fontSize: 12, marginTop: 1 },
  section: { gap: 2 },
  sectionTitle: { fontSize: 12 },
  sectionBody: { fontSize: 15, lineHeight: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
