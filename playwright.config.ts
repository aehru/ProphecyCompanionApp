import { defineConfig, devices } from '@playwright/test';

// E2E against the STATIC WEB EXPORT (`bun run build:web` → dist/), served by
// scripts/serve-web.ts. That build is the real router, the real screens and the
// real expo-sqlite (wasm), so these tests cover what the Node unit suites
// structurally cannot: mounting order, provider nesting, route resolution and
// the async DB round-trip. It is not a substitute for a device — native tabs,
// gestures, the share sheet and the camera do not exist here. Confirmations DO:
// they go through `@/lib/alert`, which draws a DsDialog rather than calling
// react-native-web's no-op `Alert` (see e2e/alerts.spec.ts).
//
//   bun run build:web && bun run e2e

const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // The PWA service worker (dist/sw.js) would answer from its cache and make
    // a test read a build it did not install. Every test starts from the network.
    serviceWorkers: 'block',
  },
  // Both window classes from use-layout.ts: below 600 (one column, the campaign
  // roster and its sheet on one screen) and above 840 (two columns, the roster
  // splits). The layout branch is a real code path, not a cosmetic difference.
  projects: [
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 420, height: 900 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `bun scripts/serve-web.ts --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
