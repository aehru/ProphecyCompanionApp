import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Node-side unit tests for pure logic (no React Native / expo-sqlite runtime).
// The `@/` alias mirrors tsconfig so modules import the same way as in the app.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
