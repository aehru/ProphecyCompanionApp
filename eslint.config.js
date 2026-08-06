// Flat ESLint config (ESLint 9). Built on eslint-config-expo's flat preset,
// which wires the TypeScript parser, React / React Hooks, and import rules.
// `tsc --noEmit` stays the type gate; this covers lint-only concerns.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    // TODO(sdk57): re-promote these to `error` and fix the 41 violations.
    //
    // eslint-config-expo 55+ turns on the React Compiler hook rules. They flag
    // pre-existing patterns across 15 files — not regressions from the SDK
    // upgrade — so they are warnings for the duration of the 54 → 57 migration
    // and get their own pass afterwards, rather than burying a hooks refactor
    // inside a dependency bump. `reactCompiler` is already on in app.json, so
    // these are worth fixing for real: `globals` in particular flags a
    // module-level variable reassigned during render (dice-roller-fab).
    rules: {
      'react-hooks/refs': 'warn', // 35 — mostly `useRef(...).current` read in render
      'react-hooks/set-state-in-effect': 'warn', // 5
      'react-hooks/globals': 'warn', // 1 — likely a real bug
    },
  },
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
