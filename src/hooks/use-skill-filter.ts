import { useState } from 'react';

import { ATTRIBUT_LABEL, ATTRIBUTS } from '@/constants/prophecy';

/**
 * Shared skills-filter state + derived meta for the editor and the read-only
 * view, so both keep the same search/tab behaviour and section title.
 *
 * `search` can be controlled (editor: the parent owns it to reset on add) or
 * left internal (view). `activeAttr` is always owned here.
 */
export function useSkillFilter(controlled?: { value: string; onChange: (t: string) => void }) {
  const [internalSearch, setInternalSearch] = useState('');
  const search = controlled ? controlled.value : internalSearch;
  const setSearch = controlled ? controlled.onChange : setInternalSearch;
  const [activeAttr, setActiveAttr] = useState<string>(ATTRIBUTS[0].key);

  const q = search.trim().toLowerCase();
  const searching = q !== '';
  const title = searching ? 'RÉSULTATS' : (ATTRIBUT_LABEL[activeAttr] ?? 'COMPÉTENCES').toUpperCase();

  return { search, setSearch, activeAttr, setActiveAttr, q, searching, title };
}
