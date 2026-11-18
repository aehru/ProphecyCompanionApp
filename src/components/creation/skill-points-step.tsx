// Points de Compétence: the age's budget (or more, if the GM grants
// experience) spent on raising any compétence — or the spécialisation, at half
// price — up to the age's limit. Priced on the COÛT DES COMPÉTENCES table.
// The caste's recommended compétences come first; the rest fold by attribut.
//
// The budget banner is its own export: the wizard pins it above the scroll so
// the total stays in sight while the list scrolls under it.

import StepperRow from '@/components/creation/stepper-row';
import { PoolBanner } from '@/components/creation/value-pick-row';
import SectionCard from '@/components/ui/section-card';
import SelectField from '@/components/ui/select-field';
import { ATTRIBUTS, DEFAULT_SKILLS } from '@/constants/prophecy';
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
import { type SkillAccess, skillAccess } from '@/lib/skill-access';
import { magicField, optionLabel, SKILL_OPTION_IDS, skillProfile } from '@/lib/skill-profiles';

/** Why a row costs double. An interdite also needs « Art interdit » — flagged, not enforced. */
const ACCESS_NOTE: Record<NonNullable<SkillAccess>, string> = {
  reservee: 'réservée ×2',
  interdite: 'interdite ×2 · Art interdit requis',
};

const TIER_OPTIONS = EXPERIENCE_TIERS.map((t) => ({ key: t.key, label: t.label }));

type Props = {
  skills: SkillBuild;
  caste: string;
  age: AgeKey | null;
  onChange: (skills: SkillBuild) => void;
};

/** What is left to spend, out of what; over budget reads in the error colour. */
export function SkillPointsBanner({ skills, caste, age }: Omit<Props, 'onChange'>) {
  const left = skillPointsLeft(skills, caste, age);
  const total = skillPoints(age, skills.tier);
  return (
    <PoolBanner
      left={[]}
      error={left < 0}
      title={left < 0 ? `Budget dépassé de ${-left}` : `${left} point${left > 1 ? 's' : ''} à dépenser`}
      note={`sur ${total} · score maximum ${skillMax(age)} à la création`}
    />
  );
}

export default function SkillPointsStep({ skills, caste, age, onChange }: Props) {
  const max = skillMax(age);
  const base = baseScores(skills, caste);
  const recommended = new Set([...(skillProfile(caste)?.recommended ?? []), ...Object.keys(base)]);
  const others = new Set(SKILL_OPTION_IDS.filter((id) => !recommended.has(id)));

  const row = (id: string) => {
    const score = skillScore(skills, caste, id);
    const from = base[id] ?? 0;
    const access = skillAccess(id, caste);
    const caption = [
      access ? ACCESS_NOTE[access] : '',
      from ? `base ${from}` : '',
      score < max ? `+1 : ${raiseCost(id, caste, score, score + 1)} pts` : 'maximum',
    ];
    return (
      <StepperRow
        key={id}
        testID={`skill-${id}`}
        label={optionLabel(id)}
        caption={caption.filter(Boolean).join(' · ')}
        value={score}
        canDec={score > from}
        canInc={score < max}
        onStep={(d) => onChange(stepSkill(skills, caste, age, id, d))}
      />
    );
  };

  const spec = skills.spec;
  const specFrom = specBase(skills, caste);

  return (
    <>
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
            caption={`départ ${specFrom}`}
            value={spec.score}
            canDec={spec.score > specFrom}
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
          {DEFAULT_SKILLS.filter((s) => s.attribut === a.key && others.has(s.name)).map((s) =>
            row(s.name),
          )}
        </SectionCard>
      ))}
      <SectionCard title="MAGIE" collapsible defaultExpanded={false}>
        {[...others].filter((id) => magicField(id) != null).map(row)}
      </SectionCard>
    </>
  );
}
