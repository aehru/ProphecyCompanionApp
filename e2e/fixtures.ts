import { test as base, expect, type Page } from '@playwright/test';

/**
 * A deep link answers with 404.html and a real 404, exactly as GitHub Pages
 * does (scripts/serve-web.ts explains why), and the browser logs the status.
 * That one line is expected; a 404 on anything with a FILE EXTENSION is a
 * missing asset and must still fail the test.
 */
function isSpaFallback(text: string, url: string) {
  if (!/status of 404/.test(text)) return false;
  const last = new URL(url).pathname.split('/').pop() ?? '';
  return !last.includes('.');
}

/**
 * A request to a server that is not there. `e2e/alerts.spec.ts` points the
 * attach dialog at a dead port on purpose, and the BROWSER logs the refusal —
 * the app never called `console.error`. Kept narrow: same-origin failures are a
 * missing asset, and anything with a file extension is one too.
 */
function isDeadServer(text: string, url: string, baseURL?: string) {
  if (!/net::ERR_CONNECTION_REFUSED/.test(text)) return false;
  if (baseURL && url.startsWith(baseURL)) return false;
  const last = new URL(url).pathname.split('/').pop() ?? '';
  return !last.includes('.');
}

/**
 * Every test asserts the app logged nothing on `console.error` and threw
 * nothing uncaught. That single assertion is what catches the class of bug
 * this suite exists for: a screen that mounts outside its provider throws
 * (« useTableRosterCtx must be used within a TableRosterProvider ») while the
 * page still looks half-rendered, so a visual assertion alone would pass.
 */
export const test = base.extend<{ appErrors: string[] }>({
  appErrors: [
    async ({ page, baseURL }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const text = m.text();
        const url = m.location().url;
        if (isSpaFallback(text, url)) return;
        if (isDeadServer(text, url, baseURL)) return;
        errors.push(`console.error: ${text}`);
      });
      await use(errors);
      expect(errors, 'the app logged errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Records the order in which the marker elements appear, from before the bundle
 * runs. Reading the DOM after the fact cannot tell « empty state, then rows »
 * (the bug) from « rows » (correct) — by then both look the same.
 */
export async function trackRenderOrder(page: Page, testIds: string[]) {
  await page.addInitScript((ids: string[]) => {
    const seen: string[] = [];
    (window as unknown as { __renderOrder: string[] }).__renderOrder = seen;
    const mark = (id: string) => {
      if (seen[seen.length - 1] !== id) seen.push(id);
    };
    const scan = () => {
      for (const id of ids) {
        // A prefix ending in `-` matches a family of rows (character-row-3, …).
        const selector = id.endsWith('-')
          ? `[data-testid^="${id}"]`
          : `[data-testid="${id}"]`;
        if (document.querySelector(selector)) mark(id);
      }
    };
    new MutationObserver(scan).observe(document, { subtree: true, childList: true });
    scan();
  }, testIds);
}

/** The markers seen so far, in order, deduplicated against repeats. */
export function renderOrder(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __renderOrder: string[] }).__renderOrder ?? []);
}

/**
 * Create a character from the list screen and return its route id. `caste` is
 * the stored KEY (`erudit`), not the accented label the picker shows.
 */
export async function createCharacter(
  page: Page,
  nom: string,
  caste?: string,
): Promise<string> {
  await page.getByTestId('fab-new-character').click();
  await page.getByTestId('field-nom').fill(nom);
  if (caste) {
    // The stack push has to be OVER before the dropdown accepts a press: while
    // the transition runs, the outgoing list screen still owns the touch
    // responder and a tap on the anchor is dropped (text fields are unaffected,
    // which is why only this one needs the wait). There is no DOM signal for it
    // — the list screen stays mounted underneath — so the settle is a delay,
    // paired with an assertion that the menu ACTUALLY opened. A stuck anchor
    // fails the test; it can never pass by luck.
    const option = page.getByTestId(`field-caste-option-${caste}`);
    await expect(async () => {
      await page.waitForTimeout(600);
      await page.getByTestId('field-caste').click();
      await expect(option).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await option.click();
  }
  await page.getByTestId('fab-save-character').click();
  await page.waitForURL(/\/character\/\d+/);
  return page.url().match(/\/character\/(\d+)/)![1];
}

/**
 * Create a PNJ from a table's salon and return its character route id. The NPC
 * joins the table on creation (`createNpc` → `setMember`), so it is on the
 * Compagnie's roster straight away.
 */
export async function createNpc(page: Page, campaignId: string, nom: string): Promise<string> {
  await page.goto(`/campaigns/${campaignId}`);
  await page.getByTestId('new-npc').click();
  await page.getByTestId('field-npc-name').fill(nom);
  await page.getByTestId('dialog-npc-submit').click();
  await page.waitForURL(/\/character\/\d+/);
  return page.url().match(/\/character\/(\d+)/)![1];
}

/**
 * Add a catalogue weapon to a character, through the picker's `+` — which names
 * itself « Ajouter <arme> ». A CATALOGUE weapon, not a blank one, because only
 * a preset carries the `skillName` that gives the card a total and a roll.
 */
export async function addCatalogWeapon(page: Page, characterId: string, name: string) {
  await page.goto(`/character/${characterId}/weapon/catalog`);
  await page.getByLabel(`Ajouter ${name}`).click();
  // The toast is the insert's acknowledgement: wait for it, or navigating away
  // races the async write.
  await expect(page.getByText(`« ${name} » ajoutée.`)).toBeVisible();
}

/** Create a local table (no server) from the campaigns screen, return its id. */
export async function createLocalTable(page: Page, name: string): Promise<string> {
  await page.getByTestId('fab-new-table').click();
  await page.getByTestId('field-table-name').fill(name);
  await page.getByTestId('dialog-submit').click();
  await page.waitForURL(/\/campaigns\/\d+/);
  return page.url().match(/\/campaigns\/(\d+)/)![1];
}
