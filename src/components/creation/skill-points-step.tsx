// Points de Compétence: the age's budget (or more, if the GM grants
// experience) spent on raising any compétence — or the spécialisation, at half
// price — up to the age's limit. Priced on the COÛT DES COMPÉTENCES table.
// The caste's recommended compétences come first; the rest fold by attribut.

import { Text } from 'react-native-paper';

import StepperRow from '@/components/creation/stepper-row';
import { PoolBanner } from '@/components/creation/value-pick-row';
import SectionCard from '@/components/ui/section-card';
import SelectField from '@/components/ui/select-field';
import { ATTRIBUTS, DEFAULT_SKILLS } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  type AgeKey,
  EXPERIENCE_TIERS,
  type ExperienceTier,
  skillMax,
  skillPoints,
} from '@/lib/creation-rules';
import {
  baseScores,
  raiseCost,
  type SkillBuild,
  skillPointsLeft,
  skillScore,
  specBase,
  stepSkill,
  stepSpec,
} from '@/lib/creation-skills';
import { skillAccess } from '@/lib/skill-access';
import { optionLabel, SKILL_OPTION_IDS, skillProfile } from '@/lib/skill-profiles';

/** Why a row costs double. An interdite also needs « Art interdit » — flagged, not enforced. */
const ACCESS_NOTE: Record<string, string> = {
  reservee: 'réservée ×2',
  interdite: 'interdite ×2 · Art interdit requis',
};

const TIER_OPTIONS =EXPERIENCE_TIERS.map((t) => ({ key: t.key, label: t.label }));

export default function SkillPointsStep({
  skills,
  caste,
  age,
  onChange,
}: {
  skills: SkillBuild;
  caste: string;
  age: AgeKey | null;
  onChange: (skills: SkillBuild) => void;
}) {
  const theme = useProphecyTheme();
  const max = skillMax(age);
  const left = skillPointsLeft(skills, caste, age);
  const base = baseScores(skills, caste);
  const recommended = new Set([...(skillProfile(caste)?.recommended ?? []), ...Object.keys(base)]);

  const row = (id: string) => {
    const score = skillScore(skills, caste, id);
    const from = base[id] ?? 0;
    const next = score < max ? raiseCost(id, caste, score, score + 1) : 0;
    return (
      <StepperRow
        key={id}
        testID={`skill-${id}`}
        label={optionLabel(id)}
        caption={[
          ACCESS_NOTE[skillAccess(id, caste) ?? ''] ?? '',
          from ? `base ${from}` : '',
          next ? `+1 : ${next} pts` : 'maximum',
        ]
          .filter(Boolean)
          .join(' · ')}
        value={score}
        canDec={score > from}
        canInc={score < max}
        onStep={(d) => onChange(stepSkill(skills, caste, age, id, d))}
      />
    );
  };

  const others = SKILL_OPTION_IDS.filter((id) => !recommended.has(id));
  const spec = skills.spec;

  return (
    <>
      <PoolBanner
        left={[]}
        title={`${left} point${Math.abs(left) > 1 ? 's' : ''} de compétence`}
        note={`sur ${skillPoints(age, skills.tier)} · score maximum ${max} à la création`}
      />
      {left < 0 ? (
        <Text style={{ color: theme.colors.error }}>Budget dépassé de {-left} points.</Text>
      ) : null}
      <SelectField
        testID="experience-tier"
        label="Expérience accordée par le MJ"
        options={TIER_OPTIONS}
        value={skills.tier}
        onChange={(k) => onChange({ ...skills, tier: k as ExperienceTier })}
        inline
      />

      {spec ? (
        <SectionCard title="SPÉCIALISATION" helper="demi-tarif">
          <StepperRow
            testID="skill-spec"
            label={`${spec.parent} (${spec.label || '…'})`}
            caption={`départ ${specBase(skills, caste)}`}
            value={spec.score}
            canDec={spec.score > specBase(skills, caste)}
            canInc={spec.score < max}
            onStep={(d) => onChange(stepSpec(skills, caste, age, d))}
          />
        </SectionCard>
      ) : null}

      {recommended.size ? (
        <SectionCard title="RECOMMANDÉES" helper="profil de caste">
          {SKILL_OPTION_IDS.filter((id) => recommended.has(id)).map(row)}
        </SectionCard>
      ) : null}

      {ATTRIBUTS.map((a) => (
        <SectionCard key={a.key} title={a.label.toUpperCase()} collapsible defaultExpanded={false}>
          {DEFAULT_SKILLS.filter((s) => s.attribut === a.key && others.includes(s.name)).map((s) =>
            row(s.name),
          )}
        </SectionCard>
      ))}
      <SectionCard title="MAGIE" collapsible defaultExpanded={false}>
        {others.filter((id) => id.includes(':')).map(row)}
      </SectionCard>
    </>
  );
}
