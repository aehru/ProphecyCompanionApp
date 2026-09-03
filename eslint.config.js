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
    // `set-state-in-effect` keeps two deliberate exceptions, both of them
    // effects synchronising with something outside React rather than deriving
    // state from props:
    //   - (root)/campaigns.tsx   — deep-link QR params open the join dialog, and
    //                              it has to fire on a cold start.
    //   - use-campaign-live.tsx  — socket lifecycle guard on the broadcast path.
    // Rewriting these as render-time updates would either change cold-start
    // behaviour or disturb the code that decides what leaves the device.
    // (database-gate.tsx used to be a third: its migration-failure setState now
    // happens inside an async IIFE, which the rule does not flag.)
    //
    // Listed as `files` rather than downgraded repo-wide: the exceptions are
    // these two, and a NEW violation elsewhere has to fail the build rather
    // than join them silently.
    files: ['src/app/(root)/campaigns.tsx', 'src/hooks/use-campaign-live.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // react-native-web's `Alert` is `class Alert { static alert() {} }` — a
    // no-op that swallows every confirm and every error message on the web
    // build. `@/lib/alert` has the same signature and renders a DsDialog on
    // every platform, so there is never a reason to reach for the original.
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Alert'],
              message: "Import { Alert } from '@/lib/alert' — react-native's is a no-op on web.",
            },
          ],
        },
      ],
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
