import { createCharacter, expect, renderOrder, test, trackRenderOrder } from './fixtures';

// Flows 1 and 2: the app boots, and a character's five tabs all mount.

test('boots on the characters list', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('fab-new-character')).toBeVisible();
  // Fresh origin storage: the DB is empty, so the empty state is the end state.
  await expect(page.getByTestId('characters-empty')).toBeVisible();
  await expect(page.getByTestId('characters-loading')).toHaveCount(0);
});

test('never flashes the empty state before the first query', async ({ page }) => {
  // Regression for 5f25a8f: useLiveQuery seeds `data` with [], so a screen that
  // reads length alone shows « Aucun personnage » for one frame on every cold
  // start. The check has to be a character that EXISTS — the loading state must
  // come first and the empty state must never be reached.
  await page.goto('/');
  await createCharacter(page, 'Kaelen');

  await trackRenderOrder(page, ['characters-loading', 'characters-empty', 'character-row-']);
  await page.goto('/');
  await expect(page.getByTestId('character-row-1')).toBeVisible();

  expect(await renderOrder(page)).toEqual(['characters-loading', 'character-row-']);
});

test('opens every character tab', async ({ page }) => {
  await page.goto('/');
  const id = await createCharacter(page, 'Kaelen');

  // Each tab is its own screen with its own queries; a broken one throws on
  // mount rather than rendering wrong, which the error fixture catches.
  const tabs = [
    ['tab-fiche', 'fiche'],
    ['tab-competences', 'skills'],
    ['tab-inventaire', 'weapons'],
    ['tab-magie', 'magic'],
    ['tab-accueil', ''],
  ] as const;

  for (const [testId, route] of tabs) {
    await page.getByTestId(testId).click();
    await page.waitForURL(new RegExp(`/character/${id}(/${route})?$`));
  }
});

test('carries a picked caste to the fiche and the list row', async ({ page }) => {
  await page.goto('/');
  const id = await createCharacter(page, 'Kaelen', 'erudit');

  // One component renders the chip in both places, so both are walked. Stored
  // accent-free and rendered WITH accents is the app-wide convention, and the
  // one thing a caste round-trip can quietly get wrong.
  //
  // Loaded fresh rather than asserted where the save left us: a pushed screen
  // leaves the list mounted underneath, chip and all, and two chips on one page
  // is not what this is measuring.
  await page.goto(`/character/${id}`);
  await expect(page.getByTestId('caste-chip')).toHaveText('Érudit');

  await page.goto('/');
  await expect(
    page.getByTestId(`character-row-${id}`).getByTestId('caste-chip'),
  ).toHaveText('Érudit');
});

test('survives a reload deep on a character tab', async ({ page }) => {
  // The SPA fallback (dist/404.html, scripts/postbuild-web.ts): dynamic routes
  // export as literal `[id]` directories, so nothing on disk answers this URL.
  await page.goto('/');
  const id = await createCharacter(page, 'Kaelen');

  await page.goto(`/character/${id}/fiche`);
  await expect(page.getByTestId('tab-fiche')).toBeVisible();
});
