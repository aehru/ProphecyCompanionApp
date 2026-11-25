// The wizard's fixed top and bottom: step counter + title + progress bar above,
// « Précédent » / « Suivant : … » below. The steps scroll between them.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { CREATION_STEPS } from '@/lib/creation';

export function WizardHeader({ step, onClose }: { step: number; onClose: () => void }) {
  const theme = useProphecyTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 4, backgroundColor: c.surface, borderColor: theme.prophecy.border },
      ]}>
      <View style={styles.headerRow}>
        <IconButton
          icon={dsIcon('close')}
          iconColor={c.primary}
          onPress={onClose}
          accessibilityLabel="Fermer"
          testID="wizard-close"
        />
        <View style={styles.headerText}>
          <Text variant="labelMedium" style={{ color: c.onSurfaceVariant }}>
            Étape {step + 1} sur {CREATION_STEPS.length}
          </Text>
          <Text variant="titleLarge">{CREATION_STEPS[step].title}</Text>
        </View>
      </View>
      <View style={styles.progress} accessibilityRole="progressbar">
        {CREATION_STEPS.map((s, i) => (
          <View
            key={s.key}
            style={[styles.segment, { backgroundColor: i <= step ? c.primary : c.outlineVariant }]}
          />
        ))}
      </View>
    </View>
  );
}

export function WizardFooter({
  step,
  busy,
  onPrev,
  onNext,
}: {
  step: number;
  busy: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useProphecyTheme();
  const insets = useSafeAreaInsets();
  const last = step === CREATION_STEPS.length - 1;
  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: insets.bottom + 16,
          backgroundColor: theme.colors.surface,
          borderColor: theme.prophecy.border,
        },
      ]}>
      <Button mode="outlined" compact onPress={onPrev} disabled={step === 0 || busy} testID="wizard-prev">
        Précédent
      </Button>
      <Button
        mode="contained"
        compact
        icon={dsIcon(last ? 'check' : 'chev')}
        contentStyle={last ? undefined : styles.nextContent}
        onPress={onNext}
        disabled={busy}
        loading={busy}
        style={styles.next}
        testID="wizard-next">
        {last ? 'Démarrer' : `Suivant : ${CREATION_STEPS[step + 1].short}`}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 12, gap: 8, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  headerText: { flex: 1 },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 16 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  next: { flexShrink: 1 },
  // The arrow reads after the label: « Suivant : Identité → ».
  nextContent: { flexDirection: 'row-reverse' },
});
