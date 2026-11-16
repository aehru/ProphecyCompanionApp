import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import FavorEditor from '@/components/favor/favor-editor';
import { HouseEntryScreen } from '@/components/house-editor';
import { customFavorQuery } from '@/repositories/custom-favors';

/** A « Maison » Faveur's editor (modal) — the Catalogues tab and an Élu's catalogue both open it. */
export default function FavorModal() {
  const { fid } = useLocalSearchParams<{ fid: string }>();
  const { data } = useLiveQuery(customFavorQuery(fid), [fid]);
  return (
    <HouseEntryScreen row={data?.[0]} notFound="Faveur introuvable.">
      {(row, close) => <FavorEditor favor={row} onClose={close} />}
    </HouseEntryScreen>
  );
}
