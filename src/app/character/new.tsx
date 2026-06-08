import { type Href, useRouter } from 'expo-router';
import React from 'react';

import CharacterForm from '@/components/character-form';
import { createCharacter } from '@/repositories/characters';

export default function NewCharacterScreen() {
  const router = useRouter();
  return (
    <CharacterForm
      submitLabel="Créer"
      onSubmit={async (data) => {
        const created = await createCharacter(data);
        // Land on the new character's fiche; back goes to the list.
        router.replace(`/character/${created.id}` as Href);
      }}
    />
  );
}
