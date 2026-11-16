import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { HouseEntryScreen } from '@/components/house-editor';
import ManoeuvreEditor from '@/components/manoeuvre/manoeuvre-editor';
import { customManoeuvreQuery } from '@/repositories/custom-manoeuvres';

/**
 * A « Maison » manœuvre's editor (modal) — the Catalogues tab and a character's
 * catalogue both open it. It opens straight on the form: the reading is the
 * catalogue row it was opened from.
 */
export default function ManoeuvreModal() {
  const { mid } = useLocalSearchParams<{ mid: string }>();
  const { data } = useLiveQuery(customManoeuvreQuery(mid), [mid]);
  return (
    <HouseEntryScreen row={data?.[0]} notFound="Manœuvre introuvable.">
      {(row, close) => <ManoeuvreEditor manoeuvre={row} onClose={close} />}
    </HouseEntryScreen>
  );
}
