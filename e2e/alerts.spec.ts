import type { Page } from '@playwright/test';

import { createCharacter, createLocalTable, expect, test } from './fixtures';

// The reason `@/lib/alert` exists: react-native-web's `Alert` is
// `class Alert { static alert() {} }`, so on this build the OLD code showed
// nothing, no `onPress` ever ran, and « Supprimer » read as a dead button.
// These run against the real web export, which is the only place that bug was
// ever visible.

/**
 * Create a character and open its delete confirmation. Returns the route id so
 * the caller can assert on the row afterwards.
 */
async function openDeleteConfirm(page: Page): Promise<string> {
  await page.goto('/');
  const id = await createCharacter(page, 'Kaelen');

  await page.goto(`/character/${id}/fiche`);
  await page.getByTestId('edit-sheet').click();
  await page.getByTestId('delete-character').click();
  return id;
}

test('a destructive confirm actually appears on web', async ({ page }) => {
  await openDeleteConfirm(page);

  await expect(page.getByText('Supprimer ce personnage ?')).toBeVisible();
  // Two slots, not one list: the way out on the left, the commit on the right.
  await expect(page.getByTestId('alert-cancel')).toBeVisible();
  await expect(page.getByTestId('alert-destructive')).toBeVisible();
});

test('cancelling keeps the character', async ({ page }) => {
  const id = await openDeleteConfirm(page);
  await page.getByTestId('alert-cancel').click();

  await expect(page.getByText('Supprimer ce personnage ?')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByTestId(`character-row-${id}`)).toBeVisible();
});

test('confirming runs the onPress the web build used to swallow', async ({ page }) => {
  const id = await openDeleteConfirm(page);
  await page.getByTestId('alert-destructive').click();

  // `onDelete` dismisses back to the list — reaching it at all is the proof the
  // handler ran, since the no-op Alert never called it.
  await page.waitForURL(/\/$/);
  await expect(page.getByTestId(`character-row-${id}`)).toHaveCount(0);
  await expect(page.getByTestId('characters-empty')).toBeVisible();
});

// The structural half: an alert raised from INSIDE an open DsDialog. Both are
// Paper `Portal`s in one host, so the alert only lands on top because it mounts
// later — and « on top » has to mean hit-testable, not merely painted, which is
// why this clicks the button rather than asserting visibility.
//
// This is also one of the two swallowed-message surfaces the roadmap named:
// `attachServer` failing used to report nothing at all on web.
test('an error raised from inside a dialog lands on top of it', async ({ page }) => {
  await page.goto('/campaigns');
  const id = await createLocalTable(page, 'Table E2E');

  await page.goto(`/campaigns/${id}`);
  await page.getByTestId('attach-server').click();
  // A closed high port refuses at once. NOT a low one: Chrome blocks those
  // outright and logs ERR_UNSAFE_PORT, which the console fixture counts as a
  // failure of the app.
  await page.getByTestId('field-server-url').fill('127.0.0.1:45999');
  await page.getByTestId('dialog-attach-submit').click();

  // The button that OPENS the dialog carries the same words as its title.
  const dialogTitle = page.getByRole('heading', { name: 'Connecter un serveur' });
  const alert = page.getByTestId('alert-confirm');
  await expect(alert).toBeVisible({ timeout: 30_000 });
  // The attach dialog is still open underneath — the alert did not replace it.
  await expect(dialogTitle).toBeVisible();

  // Would time out if the dialog's scrim were intercepting the pointer.
  await alert.click();
  await expect(alert).toHaveCount(0);
  await expect(dialogTitle).toBeVisible();
});
