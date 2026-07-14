// Flat ESLint config (ESLint 9). Built on eslint-config-expo's flat preset,
// which wires the TypeScript parser, React / React Hooks, and import rules.
// `tsc --noEmit` stays the type gate; this covers lint-only concerns.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: [
      'node_modules/*',
      '.expo/*',
      'dist/*',
      'android/*', // prebuild output (gitignored, regenerated)
      'ios/*', // prebuild output (gitignored, regenerated)
      'drizzle/*', // generated migrations — never hand-edited
      'expo-env.d.ts',
    ],
  },
]);
