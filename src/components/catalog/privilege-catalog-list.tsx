import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import CasteCatalogList from '@/components/catalog/caste-catalog-list';
import CatalogRow from '@/components/catalog-row';
import { PRIVILEGE_FAMILIES } from '@/constants/prophecy';
import { PRIVILEGE_CATALOG } from '@/data/privilege-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The Privilèges, read outside any character — one section per caste, the
 * rulebook's two headings inside each.
 *
 * Browse only, on the shared `<CasteCatalogList>` shell: a privilège cannot be
 * taken yet (it is paid for out of a budget the sheet does not model), so there
 * is nothing to pick INTO.
 */
export default function PrivilegeCatalogList() {
  const theme = useProphecyTheme();

  return (
    <CasteCatalogList
      icon="plusminus"
      emptyLabel="Privilèges pas encore saisis."
      renderCaste={(caste) => {
        const own = PRIVILEGE_CATALOG.filter((p) => p.caste === caste);
        if (own.length === 0) return null;
        return PRIVILEGE_FAMILIES.map((f) => {
          const list = own.filter((p) => p.famille === f.key);
          if (list.length === 0) return null;
          return (
            <React.Fragment key={f.key}>
              <Text style={[styles.family, { color: theme.colors.onSurfaceVariant }]}>
                {f.label}
              </Text>
              {list.map((p) => (
                <CatalogRow
                  key={p.id}
                  icon="plusminus"
                  name={p.nom}
                  // The rulebook prints the price in brackets after the name —
                  // « Apprenti (3) » — so it belongs on the row, not folded away
                  // in the detail.
                  subtitle={`${p.cout} point${p.cout > 1 ? 's' : ''}`}>
                  <Text style={[styles.body, { color: theme.colors.onSurface }]}>
                    {p.description}
                  </Text>
                </CatalogRow>
              ))}
            </React.Fragment>
          );
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  family: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
  body: { fontSize: 13, lineHeight: 19, paddingBottom: 10 },
});
