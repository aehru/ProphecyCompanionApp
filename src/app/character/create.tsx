import { type Href, usePreventRemove, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import AgeStep from '@/components/creation/age-step';
import AttributsStep from '@/components/creation/attributs-step';
import AvantagesStep from '@/components/creation/avantages-step';
import CaracStep from '@/components/creation/carac-step';
import CasteStep from '@/components/creation/caste-step';
import DesavantagesStep from '@/components/creation/desavantages-step';
import ProfileStep from '@/components/creation/profile-step';
import SkillPointsStep, { SkillPointsBanner } from '@/components/creation/skill-points-step';
import IdentityStep from '@/components/creation/identity-step';
import RecapStep from '@/components/creation/recap-step';
import TendancesStep from '@/components/creation/tendances-step';
import { WizardFooter, WizardHeader } from '@/components/creation/wizard-chrome';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { fromFormValues, toFormValues } from '@/lib/character-values';
import {
  CREATION_STEPS,
  EMPTY_BUILD,
  applyBuild,
  canLeaveStep,
  chosenTraits,
  proposeTendances,
  withAge,
} from '@/lib/creation';
import { tendanceStart } from '@/lib/creation-rules';
import { skillRows } from '@/lib/creation-skills';
import { pickImage } from '@/lib/media';
import { saveCreation } from '@/repositories/creation';
import { specName } from '@/repositories/skills';

/**
 * Guided creation: the rulebook's steps over ONE `FormValues`, the same shape
 * the full form edits, plus the `build` (age, distributed values, transferred
 * point, nation, avantages / désavantages) — its values folded in by
 * `applyBuild`, its traits inserted as rows. Nothing touches the database until
 * « Démarrer » on the last step.
 */
export default function CreateCharacterScreen() {
  const router = useRouter();
  const theme = useProphecyTheme();
  const [v, setV] = useState(() => toFormValues());
  const [build, setBuild] = useState(EMPTY_BUILD);
  const [step, setStep] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [busy, setBusy] = useState(false);

  const setField = useCallback((k: string, t: string) => setV((prev) => ({ ...prev, [k]: t })), []);
  const last = step === CREATION_STEPS.length - 1;
  const setSkills = (skills: typeof build.skills) => setBuild({ ...build, skills });
  const values = applyBuild(v, build);

  // Back (hardware, gesture, browser) walks the steps before it leaves.
  const allowLeave = usePreventRemove(step > 0, () => setStep((s) => s - 1));

  const close = () => {
    if (step === 0) {
      router.back();
      return;
    }
    Alert.alert('Abandonner la création ?', 'Ce qui a été saisi sera perdu.', [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Abandonner',
        style: 'destructive',
        onPress: () => {
          allowLeave();
          router.back();
        },
      },
    ]);
  };

  const create = async () => {
    setBusy(true);
    try {
      const id = await saveCreation(
        fromFormValues(values),
        chosenTraits(build),
        skillRows(build.skills, v.caste, specName),
        avatarUri,
      );
      allowLeave();
      router.replace(`/character/${id}` as Href);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (!canLeaveStep(step, v)) {
      setNameError(true);
      return;
    }
    setNameError(false);
    if (last) void create();
    else setStep(step + 1);
  };

  const pickAvatar = async () => {
    const uri = await pickImage('avatar');
    if (uri) setAvatarUri(uri);
  };

  const key = CREATION_STEPS[step].key;
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <WizardHeader step={step} onClose={close} />
      {key === 'competences' ? (
        // Pinned above the scroll: the budget stays in sight under a long list.
        <View style={[styles.pinned, contentWidth]}>
          <SkillPointsBanner skills={build.skills} caste={v.caste} age={build.age} />
        </View>
      ) : null}
      <KeyboardAwareScrollView
        key={key}
        contentContainerStyle={[styles.page, contentWidth]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        {key === 'age' ? (
<AgeStep age={build.age} onChange={(age) => setBuild(withAge(build, age))} />
        ) : null}
        {key === 'caste' ? <CasteStep v={v} setField={setField} /> : null}
        {key === 'carac' ? <CaracStep build={build} onChange={setBuild} /> : null}
        {key === 'attributs' ? <AttributsStep build={build} onChange={setBuild} v={v} /> : null}
        {key === 'identite' ? (
          <IdentityStep
            v={v}
            setField={setField}
            nameError={nameError && v.nom.trim() === ''}
            avatarUri={avatarUri}
            onPickAvatar={pickAvatar}
          />
        ) : null}
        {key === 'tendances' ? (
          <TendancesStep
            v={v}
            setField={setField}
            nation={build.nation}
            age={build.age}
            onPickNation={(nation) => {
              setBuild({ ...build, nation });
              if (nation) setV((prev) => proposeTendances(prev, tendanceStart(nation, build.age)));
            }}
          />
        ) : null}
        {key === 'desavantages' ? <DesavantagesStep build={build} onChange={setBuild} /> : null}
        {key === 'avantages' ? <AvantagesStep build={build} onChange={setBuild} /> : null}
        {key === 'profil' ? (
          <ProfileStep skills={build.skills} caste={v.caste} onChange={setSkills} />
        ) : null}
        {key === 'competences' ? (
          <SkillPointsStep
            skills={build.skills}
            caste={v.caste}
            age={build.age}
            onChange={setSkills}
          />
        ) : null}
        {key === 'recap' ? <RecapStep v={values} setField={setField} avatarUri={avatarUri} /> : null}
      </KeyboardAwareScrollView>
      <WizardFooter step={step} busy={busy} onPrev={() => setStep(step - 1)} onNext={next} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { padding: 16, gap: 14 },
  pinned: { paddingHorizontal: 16, paddingTop: 12, width: '100%' },
});
