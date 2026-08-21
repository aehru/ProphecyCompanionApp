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
 * Every test asserts the app logged nothing on `console.error` and threw
 * nothing uncaught. That single assertion is what catches the class of bug
 * this suite exists for: a screen that mounts outside its provider throws
 * (« useTableRosterCtx must be used within a TableRosterProvider ») while the
 * page still looks half-rendered, so a visual assertion alone would pass.
 */
export const test = base.extend<{ appErrors: string[] }>({
  appErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const text = m.text();
        if (isSpaFallback(text, m.location().url)) return;
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

/** Create a character from the list screen and return its route id. */
export async function createCharacter(page: Page, nom: string): Promise<string> {
  await page.getByTestId('fab-new-character').click();
  await page.getByTestId('field-nom').fill(nom);
  await page.getByTestId('fab-save-character').click();
  await page.waitForURL(/\/character\/\d+/);
  return page.url().match(/\/character\/(\d+)/)![1];
}

/** Create a local table (no server) from the campaigns screen, return its id. */
export async function createLocalTable(page: Page, name: string): Promise<string> {
  await page.getByTestId('fab-new-table').click();
  await page.getByTestId('field-table-name').fill(name);
  await page.getByTestId('dialog-submit').click();
  await page.waitForURL(/\/campaigns\/\d+/);
  return page.url().match(/\/campaigns\/(\d+)/)![1];
}
