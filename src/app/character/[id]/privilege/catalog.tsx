import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { CatalogFamilyHeading } from '@/components/catalog/caste-catalog-list';
import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import TraitPickDialog, { type TraitPick } from '@/components/trait-pick-dialog';
import { PRIVILEGE_FAMILIES } from '@/constants/prophecy';
import { PRIVILEGE_CATALOG, type PrivilegePreset } from '@/data/privilege-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { log } from '@/lib/log';
import { privilegesFor } from '@/lib/privilege';
import { traitCostLabel, traitOwnedBadge } from '@/lib/trait-pool';
import { characterQuery } from '@/repositories/characters';
import { createPrivilege, privilegesQuery } from '@/repositories/privileges';

/**
 * Privilèges picker (modal): the character's caste only, Ordres Noirs entries
 * once sworn (`lib/privilege`). Tap to read, `+` to take; a multi-priced entry
 * stops on the tier dialog the avantages use. Adding keeps the list open.
 */
export default function PrivilegeCatalogModal() {
  const numId = useCharacterId();
  const theme = useProphecyTheme();
  const { data: charRows } = useLiveQuery(characterQuery(numId), [numId]);
  const { data: ownedRows } = useLiveQuery(privilegesQuery(numId), [numId]);
  const added = useCatalogSnackbar(numId, 'privilege');
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();
  const [picking, setPicking] = useState<PrivilegePreset | null>(null);

  const char = charRows?.[0];
  const list = privilegesFor(PRIVILEGE_CATALOG, char?.caste, char?.darkOrders);

  // A count, not a flag: Faveur politique & co. « peut être choisi plusieurs fois ».
  const owned = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of ownedRows ?? []) {
      if (r.presetId) counts.set(r.presetId, (counts.get(r.presetId) ?? 0) + 1);
    }
    return counts;
  }, [ownedRows]);

  const insert = async (p: PrivilegePreset, pick: TraitPick) => {
    log.info('catalog.add', { entity: 'privileges', catalogId: p.id });
    const row = await createPrivilege(numId, {
      caste: p.caste,
      family: p.famille,
      darkOrders: !!p.darkOrders,
      name: p.nom,
      cost: pick.cost,
      description: p.description,
      note: pick.note,
      presetId: p.id,
      presetRevision: p.revision,
    });
    added.announce(`« ${p.nom} » ajouté.`, row.id);
  };

  const add = (p: PrivilegePreset) =>
    p.costs.length > 1 ? setPicking(p) : insert(p, { cost: p.costs[0], note: '' });

  const headings = [
    ...PRIVILEGE_FAMILIES.map((f) => ({
      key: f.key,
      label: f.label,
      rows: list.filter((p) => !p.darkOrders && p.famille === f.key),
    })),
    { key: 'dark-orders', label: 'Ordres Noirs', rows: list.filter((p) => p.darkOrders) },
  ];

  return (
    <View style={styles.root}>
      <CatalogScrollProvider value={catalogScroll}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          contentContainerStyle={[styles.container, contentWidth]}>
          {char && list.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              {char.caste
                ? 'Privilèges de cette caste pas encore saisis.'
                : 'Choisissez une caste sur la Fiche pour accéder à ses privilèges.'}
            </Text>
          ) : null}
          {headings.map(({ key, label, rows }) =>
            rows.length === 0 ? null : (
              <React.Fragment key={key}>
                <CatalogFamilyHeading label={label} />
                {rows.map((p) => (
                  <CatalogRow
                    key={p.id}
                    icon="plusminus"
                    name={p.nom}
                    subtitle={traitCostLabel(p.costs)}
                    badge={traitOwnedBadge(owned.get(p.id))}
                    addLabel={`Ajouter ${p.nom}`}
                    onAdd={() => add(p)}>
                    <Text style={[styles.body, { color: theme.colors.onSurface }]}>
                      {p.description}
                    </Text>
                  </CatalogRow>
                ))}
              </React.Fragment>
            ),
          )}
        </ScrollView>
      </CatalogScrollProvider>
      <TraitPickDialog
        key={picking?.id ?? 'none'}
        preset={picking}
        title={picking?.nom ?? ''}
        onDismiss={() => setPicking(null)}
        onConfirm={(p, pick) => {
          setPicking(null);
          insert(p, pick);
        }}
      />
      <CatalogSnackbar state={added} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 8, paddingBottom: 48 },
  empty: { fontStyle: 'italic', fontSize: 13 },
  body: { fontSize: 13, lineHeight: 19, paddingBottom: 10 },
});
