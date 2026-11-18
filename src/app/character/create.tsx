import { type Href, usePreventRemove, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import AgeStep from '@/components/creation/age-step';
import AttributsStep from '@/components/creation/attributs-step';
import CaracStep from '@/components/creation/carac-step';
import CasteStep from '@/components/creation/caste-step';
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
  proposeTendances,
} from '@/lib/creation';
import { tendanceStart } from '@/lib/creation-rules';
import { log } from '@/lib/log';
import { pickImage, storeCharacterMedia } from '@/lib/media';
import { createCharacter, setCharacterMedia } from '@/repositories/characters';

/**
 * Guided creation: the rulebook's steps over ONE `FormValues`, the same shape
 * the full form edits, plus the caractéristiques `build` (age, distributed
 * values, transferred point) folded into it by `applyBuild`. Nothing touches
 * the database until « Démarrer » on the last step.
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
      const created = await createCharacter(fromFormValues(values));
      if (avatarUri) {
        // A portrait that fails to copy never costs the character itself.
        try {
          await setCharacterMedia(created.id, 'avatar', storeCharacterMedia(created.id, 'avatar', avatarUri));
        } catch (e) {
          log.error('creation.avatar', e, { characterId: created.id });
        }
      }
      allowLeave();
      router.replace(`/character/${created.id}` as Href);
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
      <KeyboardAwareScrollView
        key={key}
        contentContainerStyle={[styles.page, contentWidth]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        {key === 'age' ? (
          <AgeStep
            age={build.age}
            // The attribut values and the Maîtrise / Chance points depend on the
            // age: a new age starts both over.
            onChange={(age) =>
              setBuild(age === build.age ? build : { ...build, age, attributs: {}, resources: {} })
            }
          />
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
        {key === 'tendances' ? <TendancesStep
            v={v}
            setField={setField}
            nation={build.nation}
            age={build.age}
            onPickNation={(nation) => {
              setBuild({ ...build, nation });
              if (nation) setV((prev) => proposeTendances(prev, tendanceStart(nation, build.age)));
            }}
          /> : null}
        {key === 'recap' ? <RecapStep v={values} setField={setField} avatarUri={avatarUri} /> : null}
      </KeyboardAwareScrollView>
      <WizardFooter
        step={step}
        busy={busy}
        onPrev={() => setStep(step - 1)}
        onNext={next}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { padding: 16, gap: 14 },
});
