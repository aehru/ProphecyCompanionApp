// Write a « Maison » manœuvre and open its editor — the one gesture behind both
// « Nouvelle manœuvre maison » and « Créer une variante maison ».

import { useRouter } from 'expo-router';

import type { NewCustomManoeuvre } from '@/db/schema';
import { createCustomManoeuvre } from '@/repositories/custom-manoeuvres';
import { detachWrite } from '@/repositories/log';

/** `data` is a variant's starting point (`variantOf`); omitted, the entry is blank. */
export function useCreateManoeuvre() {
  const router = useRouter();
  return (data?: NewCustomManoeuvre) =>
    detachWrite(
      'custom_manoeuvres',
      createCustomManoeuvre(data).then((row) => row && router.push(`/manoeuvre/${row.id}`)),
      data?.presetId ? { catalogId: data.presetId } : {},
    );
}
