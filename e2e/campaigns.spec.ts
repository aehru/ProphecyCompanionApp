import { createLocalTable, expect, test } from './fixtures';

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
