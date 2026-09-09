import React from 'react';

import ChipSelect from '@/components/ui/chip-select';

const OPTIONS = [
  { key: '', label: 'Tous' },
  { key: 'fav', label: 'Favoris' },
];

/**
 * Narrows a catalogue to the character's starred entries.
 *
 * Two chips rather than one: a lone « Favoris » chip has no visible way back
 * off, and every other filter in these lists reads as a row of choices.
 */
export default function FavoritesChip({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <ChipSelect
      label="Favoris"
      options={OPTIONS}
      value={checked ? 'fav' : ''}
      onChange={(key) => onChange(key === 'fav')}
    />
  );
}
