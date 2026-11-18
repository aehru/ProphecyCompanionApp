// Step 4 — the Attributs Majeurs by the rulebook: hand out the age's four values
// (ATTRIBUTS PAR ÂGE), then each gets the modificateur of its two related
// caractéristiques (MODIFICATEURS D'ATTRIBUTS). The chosen Statut's requis sits
// below as a reminder — prose, never checked, same rule as the rest of the app.

import React from 'react';
import { Text } from 'react-native-paper';

import ResourcesPicker from '@/components/creation/resources-picker';
import ValuePickRow, { PoolBanner } from '@/components/creation/value-pick-row';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUTS, CARACTERISTIQUES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { type FormValues, parseInteger } from '@/lib/character-values';
import {
  type CreationBuild,
  assignValue,
  attributCaracSum,
  finalAttribut,
  remainingValues,
} from '@/lib/creation';
import { ATTRIBUT_CARACS, ageBand, attributModifier, attributPool } from '@/lib/creation-rules';
import { fmtSignedMod } from '@/lib/modifiers';
import { statutFor } from '@/lib/statut';

const ABBR = Object.fromEntries(CARACTERISTIQUES.map((c) => [c.key, c.abbr]));

export default function AttributsStep({
  build,
  onChange,
  v,
}: {
  build: CreationBuild;
  onChange: (build: CreationBuild) => void;
  /** For the Statut reminder. */
  v: FormValues;
}) {
  const theme = useProphecyTheme();
  const pool = attributPool(build.age);
  const values = [...new Set(pool)];
  const left = remainingValues(pool, build.attributs);
  const band = ageBand(build.age);
  const rung = statutFor(v.caste, parseInteger(v.statut), v.darkOrders === '1');

  return (
    <>
      <PoolBanner
        left={left}
        note={`Valeurs ${band ? `d’un ${band.label.toLowerCase()}` : 'd’un adulte (aucun âge choisi)'}, puis le modificateur des deux caractéristiques liées`}
      />

      <SectionCard title="ATTRIBUTS MAJEURS">
        {ATTRIBUTS.map((a) => {
          const [c1, c2] = ATTRIBUT_CARACS[a.key];
          const sum = attributCaracSum(build, a.key);
          const mod = attributModifier(sum);
          return (
            <ValuePickRow
              key={a.key}
              testID={`attribut-${a.key}`}
              caption={`${ABBR[c1]} + ${ABBR[c2]} ${sum}${mod == null ? '' : ` → ${fmtSignedMod(mod)}`}`}
              label={a.label}
              values={values}
              mine={build.attributs[a.key]}
              left={left}
              final={finalAttribut(build, a.key)}
              onPick={(n) =>
                onChange({ ...build, attributs: assignValue(pool, build.attributs, a.key, n) })
              }
            />
          );
        })}
      </SectionCard>

      <ResourcesPicker build={build} onChange={onChange} />

      {rung ? (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {rung.nom} demande : {rung.requis.replace(/\.\s*$/, '')}. Rappel seulement, rien n’est
          bloqué.
        </Text>
      ) : null}
    </>
  );
}
