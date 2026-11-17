// This device's « Maison » Faveurs, read as presets — the rulebook ones come
// from `lib/favor` itself, which merges these in by dragon and niveau.

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import type { FavorPreset } from '@/data/favor-catalog';
import type { NewCustomFavor } from '@/db/schema';
import { customFavorPreset } from '@/lib/favor';
import { createCustomFavor, customFavorsQuery } from '@/repositories/custom-favors';
import { detachWrite } from '@/repositories/log';

export function useHouseFavors(): FavorPreset[] {
  const { data } = useLiveQuery(customFavorsQuery());
  return useMemo(() => (data ?? []).map(customFavorPreset), [data]);
}

/** Write a « Maison » Faveur and open its editor — blank or a variant. */
export function useCreateFavor() {
  const router = useRouter();
  return (data: NewCustomFavor) =>
    detachWrite(
      'custom_favors',
      createCustomFavor(data).then((row) => row && router.push(`/favor/${row.id}`)),
      data.presetId ? { catalogId: data.presetId } : {},
    );
}
