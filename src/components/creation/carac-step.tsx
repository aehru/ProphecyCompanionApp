// Step 3 — the caractéristiques by the rulebook: hand out 7/6/6/5/5/4/4/3 one
// value each, the age modificateurs fold in, then « Adapter son profil » moves
// one point — and only one — from a caractéristique to another.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import ValuePickRow, { PoolBanner } from '@/components/creation/value-pick-row';
import SectionCard from '@/components/ui/section-card';
import SelectField from '@/components/ui/select-field';
import { type CaracKey, CARACTERISTIQUES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { type CreationBuild, assignValue, finalCarac, remainingValues } from '@/lib/creation';
import { STARTING_VALUES, ageBand, ageMod } from '@/lib/creation-rules';
import { fmtSignedMod } from '@/lib/modifiers';

/** One chip per distinct value: 7, 6, 5, 4, 3. */
const VALUES = [...new Set(STARTING_VALUES)];

const CARAC_OPTIONS = [
  { key: '', label: 'Aucun' },
  ...CARACTERISTIQUES.map((c) => ({ key: c.key, label: c.label })),
];

export default function CaracStep({
  build,
  onChange,
}: {
  build: CreationBuild;
  onChange: (build: CreationBuild) => void;
}) {
  const theme = useProphecyTheme();
  const left = remainingValues(STARTING_VALUES, build.assign);
  const band = ageBand(build.age);
  const t = build.transfer;

  const setTransfer = (side: 'from' | 'to', key: string) => {
    const next = { from: t?.from ?? '', to: t?.to ?? '', [side]: key as CaracKey | '' };
    onChange({ ...build, transfer: next.from || next.to ? next : null });
  };

  return (
    <>
      <PoolBanner
        left={left}
        note={band ? `Âge : ${band.label}, modificateurs inclus` : 'Aucun âge choisi : pas de modificateur'}
      />

      <SectionCard title="VALEURS DE DÉPART">
        {CARACTERISTIQUES.map((c) => {
          const mod = ageMod(build.age, c.key);
          return (
            <ValuePickRow
              key={c.key}
              testID={`carac-${c.key}`}
              caption={mod ? `${c.abbr} ${fmtSignedMod(mod)}` : c.abbr}
              label={c.label}
              values={VALUES}
              mine={build.assign[c.key]}
              left={left}
              final={finalCarac(build, c.key)}
              onPick={(n) =>
                onChange({ ...build, assign: assignValue(STARTING_VALUES, build.assign, c.key, n) })
              }
            />
          );
        })}
      </SectionCard>

      <SectionCard title="ADAPTER SON PROFIL">
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Avec l’accord du meneur de jeu, transférez un point — et un seul — d’une caractéristique
          vers une autre.
        </Text>
        <View style={styles.transfer}>
          <SelectField
            label="Retirer 1 à"
            options={CARAC_OPTIONS}
            value={t?.from ?? ''}
            onChange={(k) => setTransfer('from', k)}
            style={styles.grow}
            inline
          />
          <SelectField
            label="Ajouter 1 à"
            options={CARAC_OPTIONS}
            value={t?.to ?? ''}
            onChange={(k) => setTransfer('to', k)}
            style={styles.grow}
            inline
          />
        </View>
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  transfer: { flexDirection: 'row', gap: 8 },
  grow: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
});
