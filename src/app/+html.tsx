// The HTML shell wrapped around every statically-rendered route (web only —
// this file is not a route and never runs on native).
//
// Overriding it replaces Expo Router's default document, so the standard head
// tags have to be restated here; what we add on top is the PWA wiring: the
// manifest, the theme colour, and the service-worker registration that makes the
// app installable and usable offline at a table with no wifi.

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Where the app is served from: '' at a domain root, '/ProphecyCompanionApp' on
// a GitHub Pages project site. Injected by babel from `experiments.baseUrl` (see
// app.config.js), so these paths follow the deployment instead of pinning it.
//
// They have to be absolute-with-base rather than plain relative: a document at
// /character/1/fiche would resolve a relative href against that path, not
// against the app root.
const BASE = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

// Registered from an inline script rather than from the app tree: it must run
// once per document, before React mounts, and it must be a no-op on the native
// bundle — which never loads this file at all.
//
// The explicit scope matters under a subpath: a worker at <base>/sw.js already
// defaults to <base>/, but stating it keeps the two in step if the file ever
// moves.
const REGISTER_SW = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('${BASE}/sw.js', { scope: '${BASE}/' }).catch(function (err) {
      // Offline support is a bonus: a failed registration must never break boot.
      // It IS worth saying out loud though — a silent catch here turns "the app
      // does not work offline" into an unexplainable bug report.
      console.warn('service worker registration failed', err);
    });
  });
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover so safe-area insets behave in a standalone window. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* NOTE: no <title> here on purpose. react-helmet-async (which Expo
            Router renders through) emits its own <title> earlier in the head, and
            the first one wins — a second tag here is silently ignored. The tab
            title is currently empty; fixing it means giving the router a title,
            not adding one to this document. */}
        <link rel="manifest" href={`${BASE}/manifest.webmanifest`} />
        <meta name="theme-color" content="#1E1F22" />
        <link rel="apple-touch-icon" href={`${BASE}/icon-512.png`} />

        {/* Keeps the body from scrolling on web, so each page owns its scroll —
            the same contract <TabPage> relies on. Must stay in the head. */}
        <ScrollViewStyleReset />

        <script dangerouslySetInnerHTML={{ __html: REGISTER_SW }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
