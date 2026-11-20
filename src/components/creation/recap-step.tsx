// Récapitulatif — the character as it will be created, the starting values (with
// an « Ajuster » into the full form's Combat + Magie fields), and what is left to
// fill from the sheet.

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import CasteChip from '@/components/caste-chip';
import CreationAvatar from '@/components/creation/creation-avatar';
import CombatTab from '@/components/sheet-form/combat-tab';
import { useFieldChains } from '@/components/sheet-form/field-chain';
import MagicTab from '@/components/sheet-form/magic-tab';
import StatutChip from '@/components/statut-chip';
import TendancesCircles from '@/components/tendances-circles';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon, type IconName } from '@/components/ui/icon';
import Icon from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { CARACTERISTIQUES, WOUND_LEVELS } from '@/constants/prophecy';
import { useCasteAccent } from '@/hooks/use-caste-accent';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { type FormValues, parseInteger } from '@/lib/character-values';
import { plural } from '@/lib/plural';

const NEXT_ON_SHEET: { icon: IconName; label: string }[] = [
  { icon: 'sword', label: 'Armes, armures & argent' },
];

export default function RecapStep({
  v,
  setField,
  avatarUri,
}: {
  v: FormValues;
  setField: (key: string, text: string) => void;
  avatarUri: string | null;
}) {
  const theme = useProphecyTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const [adjusting, setAdjusting] = useState(false);
  const initiative = parseInteger(v.initiativeMax);
  // « Égratignure 3 · Légère 2 · … », or null while the track is all zeros.
  const track = WOUND_LEVELS.map((w) => ({ label: w.label, n: parseInteger(v[`${w.key}Max`]) }));
  const wounds = track.some((w) => w.n > 0) ? track.map((w) => `${w.label} ${w.n}`).join(' · ') : null;

  return (
    <>
      <SummaryCard v={v} avatarUri={avatarUri} />

      <SectionCard title="VALEURS DE DÉPART">
        <Text style={muted}>
          La réserve de magie reprend sa valeur par défaut. Tout reste modifiable sur la fiche.
        </Text>
        <Text testID="recap-resources">
          Maîtrise {parseInteger(v.maitriseMax)} · Chance {parseInteger(v.chanceMax)}
        </Text>
        {wounds ? <Text testID="recap-wounds">Blessures : {wounds} (RÉS + VOL)</Text> : null}
        {initiative > 0 ? (
          <Text testID="recap-initiative">
            Initiative : {initiative} {plural(initiative, 'action')} par tour (COO + PER)
          </Text>
        ) : null}
        <Button
          mode="text"
          icon={dsIcon('edit')}
          style={styles.adjust}
          onPress={() => setAdjusting(true)}
          testID="recap-adjust">
          Ajuster
        </Button>
      </SectionCard>

      <SectionCard title="ENSUITE, DEPUIS LA FICHE">
        {NEXT_ON_SHEET.map((n) => (
          <View key={n.label} style={[styles.nextRow, { borderColor: theme.prophecy.borderSoft }]}>
            <Icon name={n.icon} size={20} color={theme.colors.primary} />
            <Text>{n.label}</Text>
          </View>
        ))}
      </SectionCard>

      <AdjustDialog
        visible={adjusting}
        v={v}
        setField={setField}
        onDismiss={() => setAdjusting(false)}
      />
    </>
  );
}

function SummaryCard({ v, avatarUri }: { v: FormValues; avatarUri: string | null }) {
  const theme = useProphecyTheme();
  const c = theme.colors;
  const accent = useCasteAccent(v.caste) ?? c.primary;
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: theme.prophecy.border }]}>
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <View style={styles.who}>
        <CreationAvatar nom={v.nom} caste={v.caste} uri={avatarUri} size={56} />
        <View style={styles.whoText}>
          <Text variant="titleLarge" numberOfLines={1}>
            {v.nom.trim()}
          </Text>
          {v.concept.trim() ? (
            <Text style={{ color: c.onSurfaceVariant }}>{v.concept.trim()}</Text>
          ) : null}
          <View style={styles.chips}>
            <CasteChip caste={v.caste || null} />
            <StatutChip caste={v.caste || null} statut={parseInteger(v.statut)} darkOrders={v.darkOrders === '1'} />
          </View>
        </View>
      </View>
      <TendancesCircles
        size={40}
        get={(k) => ({ value: parseInteger(v[k]), sub: parseInteger(v[`${k}Sub`]) })}
      />
      <View style={styles.carac}>
        {CARACTERISTIQUES.map((k) => (
          <View key={k.key} style={[styles.caracCell, { backgroundColor: c.surfaceVariant }]}>
            <Text variant="titleMedium">{parseInteger(v[k.key])}</Text>
            <Text style={[styles.caracAbbr, { color: c.onSurfaceVariant }]}>{k.abbr}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The full form's Combat + Magie tabs, verbatim, for whoever wants them now. */
function AdjustDialog({
  visible,
  v,
  setField,
  onDismiss,
}: {
  visible: boolean;
  v: FormValues;
  setField: (key: string, text: string) => void;
  onDismiss: () => void;
}) {
  const { chains } = useFieldChains();
  return (
    <DsDialog
      visible={visible}
      onDismiss={onDismiss}
      title="Valeurs de départ"
      // Edits land as they are typed, so the only button is the way out.
      dismiss={<Button onPress={onDismiss}>Fermer</Button>}>
      <CombatTab v={v} chain={chains.combat} setField={setField} />
      <MagicTab v={v} chain={chains.magie} setField={setField} />
    </DsDialog>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, paddingTop: 19, gap: 14, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, right: 0, top: 0, height: 3 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  whoText: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  carac: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  caracCell: { flexBasis: '23%', flexGrow: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 8 },
  caracAbbr: { fontSize: 10, letterSpacing: 0.6 },
  adjust: { alignSelf: 'flex-start' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, borderBottomWidth: 1 },
});
