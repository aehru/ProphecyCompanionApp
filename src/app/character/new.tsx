import { type Href, useRouter } from 'expo-router';
import React from 'react';

import CharacterForm from '@/components/character-form';
import { createCharacter } from '@/repositories/characters';
import { replaceSkills } from '@/repositories/skills';

export default function NewCharacterScreen() {
  const router = useRouter();
  return (
    <CharacterForm
      submitLabel="Créer"
      onSubmit={async (data, skills) => {
        const created = await createCharacter(data);
        await replaceSkills(created.id, skills);
        // Land on the new character's fiche; back goes to the list.
        router.replace(`/character/${created.id}` as Href);
      }}
    />
  );
}
