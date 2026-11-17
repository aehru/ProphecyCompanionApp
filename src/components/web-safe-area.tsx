import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { type EdgeInsets, SafeAreaInsetsContext } from 'react-native-safe-area-context';

const ZERO: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function readInsets(probe: HTMLElement): EdgeInsets {
  const style = getComputedStyle(probe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

/**
 * Web only: gives `useSafeAreaInsets` real numbers again.
 *
 * Since SDK 58 expo-router's web root hands out zero insets, leaving CSS `env()`
 * as the only source. The headers, FABs and overlays compute with those numbers,
 * so one probe here serves all of them instead of each moving to `calc()`.
 *
 * Starts at zero and measures after mount, which keeps the first client render
 * identical to the static HTML. The viewport's `viewport-fit=cover` (+html.tsx)
 * is what makes `env()` non-zero on a notched device.
 */
export default function WebSafeAreaInsets({ children }: { children: React.ReactNode }) {
  const [insets, setInsets] = useState(ZERO);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
      'env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(probe);
    const update = () => setInsets(readInsets(probe));
    update();
    // The insets swap sides when a phone rotates.
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      probe.remove();
    };
  }, []);

  if (Platform.OS !== 'web') return children;
  return <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>;
}
