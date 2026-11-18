// Profil de caste: the five compétences every member of the caste starts with,
// scored 6 / 6 / 5 / 5 / 4 — a slot offering a choice asks for it first — then
// the one creation spécialisation, which starts at its mother's score.

import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import ValuePickRow, { PoolBanner } from '@/components/creation/value-pick-row';
import ChipSelect from '@/components/ui/chip-select';
import SectionCard from '@/components/ui/section-card';
import SelectField from '@/components/ui/select-field';
import { CASTE_LABEL } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  baseScores,
  chooseProfileOption,
  scoreProfileSlot,
  setSpec,
  type SkillBuild,
} from '@/lib/creation-skills';
import { remainingValues } from '@/lib/distribution';
import { magicField, optionLabel, PROFILE_VALUES, skillProfile } from '@/lib/skill-profiles';

/** Past this many options a slot is a dropdown rather than a row of chips. */
const CHIP_LIMIT = 4;
const VALUES = [...new Set(PROFILE_VALUES)];

export default function ProfileStep({
  skills,
  caste,
  onChange,
}: {
  skills: SkillBuild;
  caste: string;
  onChange: (skills: SkillBuild) => void;
}) {
  const theme = useProphecyTheme();
  const muted = { color: theme.colors.onSurfaceVariant };
  const profile = skillProfile(caste);

  if (!profile) {
    return (
      <Text style={muted}>
        Sans caste, pas de profil de base : toutes les compétences se développent avec les Points
        de Compétence, à l’étape suivante.
      </Text>
    );
  }

  const mine = skills.caste === caste ? skills : null;
  const left = remainingValues(PROFILE_VALUES, mine?.values ?? {});
  const base = baseScores(skills, caste);

  return (
    <>
      <PoolBanner
        left={left}
        note={`Les compétences de base des ${CASTE_LABEL[caste].toLowerCase()}s`}
      />
      <SectionCard title="COMPÉTENCES DE BASE">
        {profile.slots.map((options, i) => {
          const chosen = mine?.choices[i];
          const opts = options.map((id) => ({ key: id, label: optionLabel(id) }));
          return (
            <View key={i} style={styles.slot} testID={`profile-slot-${i}`}>
              {options.length > 1 && options.length <= CHIP_LIMIT ? (
                <ChipSelect
                  options={opts}
                  value={chosen ?? ''}
                  onChange={(id) => onChange(chooseProfileOption(skills, caste, i, id))}
                />
              ) : options.length > CHIP_LIMIT ? (
                <SelectField
                  label="Au choix"
                  options={opts}
                  value={chosen ?? ''}
                  onChange={(id) => onChange(chooseProfileOption(skills, caste, i, id))}
                  inline
                />
              ) : null}
              <ValuePickRow
                caption={options.length > 1 ? 'au choix' : ''}
                label={
                  chosen ? optionLabel(chosen) : options.length === 1 ? optionLabel(options[0]) : '—'
                }
                values={VALUES}
                mine={mine?.values[i]}
                left={left}
                final={mine?.values[i] ?? null}
                onPick={(n) => {
                  // A one-option slot needs no choice: scoring it fills it.
                  const s =
                    options.length === 1 && !chosen
                      ? chooseProfileOption(skills, caste, i, options[0])
                      : skills;
                  onChange(scoreProfileSlot(s, caste, i, n));
                }}
              />
            </View>
          );
        })}
      </SectionCard>

      <SpecSection skills={skills} caste={caste} base={base} onChange={onChange} />
    </>
  );
}

/** One spécialisation, of a compétence the profile scored (not of a magic score). */
function SpecSection({
  skills,
  caste,
  base,
  onChange,
}: {
  skills: SkillBuild;
  caste: string;
  base: Record<string, number>;
  onChange: (skills: SkillBuild) => void;
}) {
  const theme = useProphecyTheme();
  const mothers = Object.keys(base).filter((id) => magicField(id) == null);
  const spec = skills.spec;
  return (
    <SectionCard title="SPÉCIALISATION" helper="facultative">
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        Une seule à la création. Elle démarre au score de sa compétence et ne s’utilise que pour cet
        aspect précis (Épée longue pour Armes tranchantes).
      </Text>
      <SelectField
        testID="spec-parent"
        label="Compétence"
        options={[{ key: '', label: 'Aucune' }, ...mothers.map((m) => ({ key: m, label: m }))]}
        value={spec?.parent ?? ''}
        onChange={(m) => onChange(setSpec(skills, caste, m || null, spec?.label ?? ''))}
        inline
      />
      {spec ? (
        <TextInput
          label="Nom de la spécialisation"
          value={spec.label}
          onChangeText={(t) => onChange(setSpec(skills, caste, spec.parent, t))}
        />
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  slot: { gap: 6 },
});
