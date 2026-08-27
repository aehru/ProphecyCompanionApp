/**
 * The project's public addresses, in one place. They already appear in README,
 * DEV.md and PRIVACY.md; the app pointing at a stale fork is exactly the kind of
 * drift a second copy causes, so every screen reads them from here.
 */
import { Linking } from 'react-native';

export const REPO_URL = 'https://github.com/aehru/ProphecyCompanionApp';
export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/dev/LICENSE`;
export const SERVER_REPO_URL = 'https://github.com/aehru/ProphecyCompanionServer';

/**
 * Opens a page OUTSIDE the app, in the system browser.
 *
 * `Linking` rather than expo-web-browser's in-app tab: leaving the app is the
 * honest signal that the destination is not ours, and react-native-web maps this
 * to a new tab on the web build with no extra branch.
 *
 * Never throws. A device with no browser — or a web view that blocks the popup —
 * is not a reason to take down the screen that offered the link.
 */
export async function openExternal(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    /* no browser to open it with; nothing sensible to do */
  }
}

/**
 * The « ouvrir un ticket » address, with the two facts triage always asks for
 * already in the body. Deliberately nothing else: a URL is a transmission, and
 * the diagnostic log leaves the device through the share sheet ALONE — see
 * privacy.tsx. The caller passes the context so this module stays free of the
 * log's imports.
 */
export function newIssueUrl(context: string) {
  return `${ISSUES_URL}/new?body=${encodeURIComponent(`\n\n---\n${context}`)}`;
}
