import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { Button, Text } from 'react-native-paper';

import StatutDetail from '@/components/statut-detail';
import DsDialog from '@/components/ui/ds-dialog';
import IdentityChip, { type ChipTone } from '@/components/ui/identity-chip';
import { CASTE_LABEL } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { statutFor, statutLabel } from '@/lib/statut';
import { OVERLAY_INK } from '@/theme/overlayInk';

/**
 * The Statut pill: « III · Artisan », sitting beside the caste chip it belongs
 * to. Tapping it opens the rung's requirements, bénéfice and Technique, with the
 * NEXT rung under them — which is what a player at a Statut is actually looking
 * for (« what do I need for the next one »).
 *
 * Renders NOTHING without a caste or at Statut 0: « aucun Statut » is the state
 * of every fresh character, and a chip saying so would shout an absence on every
 * unfilled sheet — the same reasoning as CasteChip's NULL caste.
 *
 * It carries the caste's gold, so the FILL is what tells the two apart: side by
 * side, two identical gold-ringed pills would read as one wrapped label.
 */
export default function StatutChip({
  caste,
  statut,
  style,
  tone = 'surface',
}: {
  caste?: string | null;
  statut?: number | null;
  style?: ViewStyle;
  tone?: ChipTone;
}) {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState(false);
  const label = statutLabel(caste, statut);
  if (!label) return null;

  const color = tone === 'overlay' ? OVERLAY_INK.gold : theme.colors.secondary;
  const rung = statutFor(caste, statut);
  const next = statutFor(caste, (statut ?? 0) + 1);

  return (
    <>
      <IdentityChip
        testID="statut-chip"
        label={label}
        color={color}
        fill={`${color}22`}
        onPress={() => setOpen(true)}
        accessibilityLabel={`Statut ${label}`}
        style={style}
      />

      <DsDialog
        visible={open}
        onDismiss={() => setOpen(false)}
        testID="statut-dialog"
        title={`Statut — ${CASTE_LABEL[caste ?? ''] ?? caste}`}
        dismiss={<Button onPress={() => setOpen(false)}>Fermer</Button>}>
        {rung ? (
          <ScrollView>
            <StatutDetail rung={rung} />
            {next ? (
              <View style={styles.next}>
                <Text style={[styles.nextLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Statut suivant
                </Text>
                <StatutDetail rung={next} muted />
              </View>
            ) : null}
          </ScrollView>
        ) : (
          // The number is a fact the player entered; the text simply isn't typed
          // in for this caste. Saying so beats an empty dialog.
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Les Statuts de cette caste ne sont pas encore saisis.
          </Text>
        )}
      </DsDialog>
    </>
  );
}

const styles = StyleSheet.create({
  next: { marginTop: 12, gap: 4 },
  nextLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
});
