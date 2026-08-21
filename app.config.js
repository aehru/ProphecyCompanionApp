// Dynamic Expo config. Everything real still lives in app.json — this only adds
// the ONE value that cannot be static: the web base URL.
//
// `experiments.baseUrl` is read by the CLI for every platform, not just web
// (getBaseUrlFromExpoConfig in @expo/cli), and expo-router's `appendBaseUrl` has
// no platform guard — so putting it in app.json would prefix native production
// routes too. Gating it behind an env var keeps native builds byte-identical to
// what they were, and makes the deployment path a build-time argument rather
// than a committed decision:
//
//   WEB_BASE_URL=ProphecyCompanionApp bun run build:web   # GitHub Pages project site
//   bun run build:web                                     # any root-served host
//
// Moving the app to a custom domain later is therefore a one-line change to the
// CI workflow, not a code change. (User data does NOT follow: the database lives
// in OPFS, which is scoped to the origin — a host change is a fresh start unless
// people export first.)
//
// Write it WITHOUT a leading slash. Git Bash on Windows rewrites a value that
// starts with `/` into a Windows path (`C:/Program Files/Git/...`), which then
// ends up baked into every asset URL. Both forms are accepted and normalised
// below, but the slash-less one is the one that survives every shell.

const app = require('./app.json');

module.exports = () => {
  const raw = process.env.WEB_BASE_URL?.trim().replace(/^\/+|\/+$/g, '');

  return {
    ...app.expo,
    experiments: {
      ...app.expo.experiments,
      ...(raw ? { baseUrl: `/${raw}` } : {}),
    },
  };
};
