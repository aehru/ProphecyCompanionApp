// Automatic capture: the events a tester can't be asked to reproduce on demand.
//
//  - uncaught JS errors (React Native's global handler, `window.onerror` on web);
//  - unhandled promise rejections;
//  - app going to background → forced flush, because the OS may freeze or kill
//    the process before the 2s debounce ever fires.
//
// Render errors are caught separately by <LogErrorBoundary>, and route changes
// by useRouteBreadcrumbs — both need React, which this module deliberately
// avoids so it can be installed before the tree mounts.

import { AppState, type AppStateStatus } from 'react-native';

import { log } from './index';

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

interface ErrorUtilsShape {
  getGlobalHandler?: () => GlobalErrorHandler | undefined;
  setGlobalHandler?: (h: GlobalErrorHandler) => void;
}

let installed = false;

/**
 * Install every process-level hook. Idempotent; returns a teardown function so
 * a caller (a test, a hot reload) can put the previous handlers back.
 */
export function installCapture(): () => void {
  if (installed) return () => {};
  installed = true;
  const teardowns: (() => void)[] = [];

  teardowns.push(installUncaughtHandler());
  teardowns.push(installRejectionHandler());
  teardowns.push(installBackgroundFlush());

  return () => {
    for (const fn of teardowns) fn();
    installed = false;
  };
}

/**
 * React Native routes uncaught errors through `ErrorUtils`, not `window`. We
 * chain rather than replace: the default handler is what shows the red box in
 * dev and reports the crash to the OS in production.
 */
function installUncaughtHandler(): () => void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error, isFatal) => {
      log.error('error.uncaught', error, { reason: isFatal ? 'fatal' : 'non-fatal' });
      previous?.(error, isFatal);
    });
    return () => {
      if (previous) errorUtils.setGlobalHandler?.(previous);
    };
  }

  // Web / any runtime with the DOM error event.
  const target = globalThis as unknown as {
    addEventListener?: (t: string, h: (e: unknown) => void) => void;
    removeEventListener?: (t: string, h: (e: unknown) => void) => void;
  };
  if (!target.addEventListener) return () => {};
  const onError = (e: unknown) => {
    const err = (e as { error?: unknown })?.error ?? e;
    log.error('error.uncaught', err, { reason: 'window' });
  };
  target.addEventListener('error', onError);
  return () => target.removeEventListener?.('error', onError);
}

/**
 * Unhandled rejections. The DOM event exists on web and on modern Hermes; the
 * `promise` rejection-tracking module that ships with React Native is the
 * fallback for older native runtimes. Both paths are guarded — a missing hook
 * costs us one class of log line, never a crash.
 */
function installRejectionHandler(): () => void {
  const target = globalThis as unknown as {
    addEventListener?: (t: string, h: (e: unknown) => void) => void;
    removeEventListener?: (t: string, h: (e: unknown) => void) => void;
  };
  if (target.addEventListener) {
    const onRejection = (e: unknown) => {
      const reason = (e as { reason?: unknown })?.reason ?? e;
      log.error('error.rejection', reason);
    };
    target.addEventListener('unhandledrejection', onRejection);
    return () => target.removeEventListener?.('unhandledrejection', onRejection);
  }

  try {
    // Deliberately a require: this module only exists in the React Native
    // runtime, and a static import would break the web bundle and the Node
    // test runner at load time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracking = require('promise/setimmediate/rejection-tracking') as {
      enable: (opts: {
        allRejections: boolean;
        onUnhandled: (id: number, error: unknown) => void;
        onHandled: () => void;
      }) => void;
    };
    tracking.enable({
      allRejections: true,
      onUnhandled: (_id, error) => log.error('error.rejection', error),
      onHandled: () => {},
    });
  } catch {
    // module absent — nothing to install
  }
  return () => {};
}

/**
 * Background = the last safe moment to write. Anything still sitting behind the
 * debounce would be lost if the OS reclaims the process while suspended.
 */
function installBackgroundFlush(): () => void {
  const onChange = (state: AppStateStatus) => {
    if (state === 'active') return;
    log.debug('app.background', { status: state });
    void log.flush();
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}
