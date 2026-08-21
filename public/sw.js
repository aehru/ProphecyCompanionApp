// Offline service worker for the web/desktop build.
//
// Offline is not a nicety here: the app is used at a table, and a GM whose wifi
// drops must still reach their characters — the data itself is already local
// (SQLite in OPFS), so only the shell needs to survive.
//
// Deliberately NOT a generated precache manifest: the bundle filenames are
// content-hashed per build, so a hardcoded list would rot on every export. This
// caches at runtime instead — everything the app actually fetched last time is
// there next time, which for a single-page-per-route static export is the whole
// shell after one visit.
//
// Nothing here touches the database. OPFS is not part of the Cache API, so the
// worker can never interfere with (or evict) a user's characters.

const VERSION = 'v1';
const CACHE = `prophecy-${VERSION}`;

self.addEventListener('install', (event) => {
  // The app shell is whatever the start URL pulls in; grab the entry document so
  // a first-visit-then-offline still boots.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request('./', { cache: 'reload' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Cache a response only if it is one we can actually replay later. */
function cacheable(res) {
  return res && res.status === 200 && res.type === 'basic';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Documents: network first, so a redeploy is picked up on the next online
  // load; fall back to the cached copy of this route, then to the start URL,
  // which is what makes a deep link work offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (cacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match('./'))
            .then((hit) => hit || Response.error()),
        ),
    );
    return;
  }

  // Everything else (hashed JS, fonts, the wasm): serve from cache immediately
  // and refresh in the background. Hashed names mean a stale hit is never wrong
  // — a new build requests new URLs.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => {
          if (cacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || network;
    }),
  );
});
