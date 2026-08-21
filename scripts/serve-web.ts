// Static server for the web export, used by the E2E suite (playwright.config.ts).
//
// It deliberately mirrors GitHub Pages rather than a generic dev server, because
// the deployment these tests protect IS GitHub Pages:
//   - dynamic routes export as LITERAL directories (dist/character/[id]/fiche.html),
//     so nothing on disk answers /character/1/fiche;
//   - Pages then serves 404.html WITHOUT redirecting, so the URL survives and
//     expo-router resolves the route client-side (see scripts/postbuild-web.ts).
// The fallback therefore answers with 404.html AND a real 404 status, exactly as
// production does. Relaxing that here would hide a broken postbuild.
//
//   bun scripts/serve-web.ts --port 4173

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const portArg = process.argv.indexOf('--port');
const port = Number(portArg === -1 ? (process.env.E2E_PORT ?? 4173) : process.argv[portArg + 1]);

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ is missing — run `bun run build:web` first.');
  process.exit(1);
}

// Enough of a table for the export. `.wasm` is the one that MUST be right:
// expo-sqlite instantiates wa-sqlite.wasm by streaming, which rejects any
// content-type but application/wasm — get it wrong and the app boots with no DB.
const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

/** The first of `p`, `p.html`, `p/index.html` that exists as a file. */
function resolveFile(pathname: string): string | null {
  // `normalize` collapses any ../ before the prefix check, so a crafted URL
  // cannot walk out of dist/.
  const target = normalize(join(DIST, decodeURIComponent(pathname)));
  if (!target.startsWith(DIST)) return null;
  for (const candidate of [target, `${target}.html`, join(target, 'index.html')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', `http://localhost:${port}`).pathname;
  const file = resolveFile(pathname);
  const served = file ?? join(DIST, '404.html');
  res.writeHead(file ? 200 : 404, {
    'content-type': MIME[extname(served)] ?? 'application/octet-stream',
    // A stale bundle between runs is a debugging trap the suite cannot see.
    'cache-control': 'no-store',
  });
  createReadStream(served).pipe(res);
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`));
