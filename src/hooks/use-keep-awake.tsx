import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * « Garder l'écran allumé » (issue #205): a phone lying on the table between
 * two rolls should not lock. A DEVICE preference like the « Apparence » one —
 * AsyncStorage, never exported. The provider both holds the choice and applies
 * it, app-wide, for as long as the app is foregrounded (the OS drops the lock
 * in the background on its own).
 */
const STORAGE_KEY = 'display.keepAwake';
const TAG = 'prophecy.keep-awake';

type KeepAwake = { keepAwake: boolean; setKeepAwake: (on: boolean) => void };

const Ctx = createContext<KeepAwake>({ keepAwake: false, setKeepAwake: () => {} });

export function KeepAwakeProvider({ children }: { children: React.ReactNode }) {
  const [keepAwake, setState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setState(v === '1'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!keepAwake) return;
    // A browser without the Wake Lock API rejects: the screen simply sleeps.
    activateKeepAwakeAsync(TAG).catch(() => {});
    return () => {
      void deactivateKeepAwake(TAG).catch(() => {});
    };
  }, [keepAwake]);

  const setKeepAwake = (on: boolean) => {
    setState(on);
    void (on ? AsyncStorage.setItem(STORAGE_KEY, '1') : AsyncStorage.removeItem(STORAGE_KEY)).catch(
      () => {},
    );
  };

  return <Ctx.Provider value={{ keepAwake, setKeepAwake }}>{children}</Ctx.Provider>;
}

export const useKeepAwakePref = () => useContext(Ctx);
