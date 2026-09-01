import { addCatalogWeapon, createLocalTable, createNpc, expect, test } from './fixtures';

// Flows 3 and 4: the campaign subtree. Both are regressions — this is the tab
// that broke twice in two days.

test('boots on the campaigns list', async ({ page }) => {
  await page.goto('/campaigns');

  await expect(page.getByTestId('campaigns-empty')).toBeVisible();
  await expect(page.getByTestId('campaigns-loading')).toHaveCount(0);
});

test('creates a local table and opens its screens', async ({ page }) => {
  // Regression for b8c226e: the layout resolves the campaign row and provides
  // the roster context; child effects run BEFORE the parent's, so a screen used
  // to mount and read the context before the provider existed. A cold load
  // straight onto the URL is the repro — a client-side push finds the query warm.
  await page.goto('/campaigns');
  const id = await createLocalTable(page, 'Table E2E');

  await expect(page.getByTestId('campaign-not-found')).toHaveCount(0);
  await expect(page.getByTestId('open-compagnie')).toBeVisible();

  await page.goto(`/campaigns/${id}`);
  await expect(page.getByTestId('open-compagnie')).toBeVisible();
  await expect(page.getByTestId('campaign-loading')).toHaveCount(0);

  await page.goto(`/campaigns/${id}/compagnie`);
  await expect(page.getByTestId('campaign-not-found')).toHaveCount(0);
  await expect(page.getByTestId('compagnie-screen')).toBeVisible();
});

test('shows a not-found state for a missing table', async ({ page }) => {
  // Regression for 0afb802: the row read returns nothing (bad id, or the table
  // was deleted while open). The subtree used to spin forever, because each
  // screen only guards its own transient loading.
  await page.goto('/campaigns/999999');

  await expect(page.getByTestId('campaign-not-found')).toBeVisible();
  await expect(page.getByTestId('campaign-loading')).toHaveCount(0);
});

test('opens a PNJ sheet from the roster and rolls from inside it', async ({ page }) => {
  // Regression for the app-level dice roller. <GmCharacterSheet> is a Paper
  // Portal on a phone, and a portal's children mount under the PortalHost
  // inside <PaperProvider> — ABOVE everything `_layout` mounts. A React context
  // provider down there is therefore invisible to the sheet, so <NpcGearSections>
  // threw « useDiceRoller must be used within DiceRollerProvider » on mount and
  // took the app down with it. The roller is a module store now
  // (`lib/dice-roller`), which has no tree position at all.
  //
  // The suite missed it because no test had ever opened the sheet: the table was
  // always empty. So this walks the whole path — a PNJ at the table, its card,
  // its sheet, and a roll STARTED FROM INSIDE the sheet, which is the part a
  // provider cannot do.
  await page.goto('/campaigns');
  const tableId = await createLocalTable(page, 'Table E2E');
  const charId = await createNpc(page, tableId, 'Garde');
  // Gear is the half of the sheet the wire never carries, and it is where the
  // throw was. The roll button needs a compétence that resolves, which is what a
  // catalogue weapon brings (`weapons.skillName`); a blank one has none.
  await addCatalogWeapon(page, charId, 'Épée courte');

  await page.goto(`/campaigns/${tableId}/compagnie`);
  // Keyed by the portable uuid, which the test has no way to know.
  const card = page.getByTestId(/^roster-card-/).first();
  await expect(card).toBeVisible();
  await card.click();

  // Both window classes reach the same body: a bottom sheet below 840dp (the
  // Portal — the phone project), a side pane above it (the tablet project).
  await expect(page.getByTestId('gm-sheet')).toBeVisible();
  const weapons = page.getByTestId('npc-gear-weapons');
  await expect(weapons).toBeVisible();

  // « Lancer Armes tranchantes, total N » — scoped to the section so the header's
  // own dice button can never stand in for it.
  await weapons.getByLabel(/^Lancer /).first().click();
  await expect(page.getByTestId('dice-roller-dialog')).toBeVisible();
});
