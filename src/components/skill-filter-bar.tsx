import React from 'react';
import { ScrollView } from 'react-native';
import { SegmentedButtons, TextInput } from 'react-native-paper';

import { ATTRIBUTS } from '@/constants/prophecy';

/**
 * Shared skills filter UI: a global search field plus one tab per attribut.
 * Search overrides the tabs (the tab row hides while searching). Both the
 * editor and the read-only view use this so the filter behaviour stays in sync.
 */
export default function SkillFilterBar({
  search,
  onSearch,
  activeAttr,
  onAttr,
}: {
  search: string;
  onSearch: (t: string) => void;
  activeAttr: string;
  onAttr: (key: string) => void;
}) {
  const searching = search.trim() !== '';
  return (
    <>
      <TextInput
        label="Rechercher une compétence"
        value={search}
        onChangeText={onSearch}
        mode="outlined"
        dense
        left={<TextInput.Icon icon="magnify" />}
        right={search ? <TextInput.Icon icon="close" onPress={() => onSearch('')} /> : undefined}
      />
      {searching ? null : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <SegmentedButtons
            value={activeAttr}
            onValueChange={onAttr}
            density="small"
            buttons={ATTRIBUTS.map((a) => ({ value: a.key, label: a.label }))}
          />
        </ScrollView>
      )}
    </>
  );
}
