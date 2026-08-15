// Post-processing for the static web export. Run by `bun run build:web`.
//
// Adds the two files a plain static host (GitHub Pages in particular) needs and
// that `expo export` does not produce.

import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const index = join(DIST, 'index.html');
if (!existsSync(index)) {
  console.error('dist/index.html is missing — run the export first.');
  process.exit(1);
}

// 1. 404.html — the deep-link fallback.
//
// Dynamic routes export as LITERAL directories: dist/character/[id]/fiche.html.
// Nothing answers /character/1/fiche, so refreshing on a character sheet (or
// following a bookmark) 404s on any host without rewrite rules. GitHub Pages
// serves 404.html for unmatched paths WITHOUT redirecting, so the URL survives
// and expo-router resolves the route on the client — the classic SPA fallback.
//
// The response still carries HTTP 404. That is fine here: the service worker
// only caches status 200, so a fallback can never be stored as if it were the
// real page.
copyFileSync(index, join(DIST, '404.html'));

// 2. .nojekyll — stops GitHub Pages running the output through Jekyll.
//
// Not cosmetic: Jekyll silently drops files and directories whose name starts
// with an underscore, and the entire JS bundle lives in `_expo/`. Without this
// the site deploys and then fails to boot with 404s on every script.
writeFileSync(join(DIST, '.nojekyll'), '');

console.log('web export post-processed: 404.html + .nojekyll');
