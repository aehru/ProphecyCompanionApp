// Flat ESLint config (ESLint 9). Built on eslint-config-expo's flat preset,
// which wires the TypeScript parser, React / React Hooks, and import rules.
// `tsc --noEmit` stays the type gate; this covers lint-only concerns.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    // eslint-config-expo 55+ turns on the React Compiler hook rules. `refs` and
    // `globals` were fixed outright and stay at the preset's `error`.
    //
    // `set-state-in-effect` keeps three deliberate exceptions, all of them
    // effects synchronising with something outside React rather than deriving
    // state from props:
    //   - _layout.tsx          — reacts to an async migration failure, next to
    //                            restoreDatabase() and AsyncStorage work.
    //   - campaigns/index.tsx  — deep-link QR params open the join dialog, and
    //                            it has to fire on a cold start.
    //   - use-campaign-live    — socket lifecycle guard on the broadcast path.
    // Rewriting these as render-time updates would either change cold-start
    // behaviour or disturb the code that decides what leaves the device.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
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
