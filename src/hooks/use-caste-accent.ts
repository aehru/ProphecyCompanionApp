import { CASTE_PATRON, type CasteKey } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { DragonAccents } from '@/theme/dragonsTheme';

/** A caste's accent: its patron dragon's primary for the current scheme. Null outside a caste. */
export function useCasteAccent(caste: string | null | undefined): string | null {
  const theme = useProphecyTheme();
  const patron = caste ? CASTE_PATRON[caste as CasteKey] : undefined;
  return patron ? DragonAccents[patron][theme.dark ? 'dark' : 'light'].primary : null;
}
