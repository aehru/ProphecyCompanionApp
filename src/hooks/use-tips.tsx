import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Which « Astuces » this device has dismissed (lib/tips). A DEVICE preference
 * like the Apparence — AsyncStorage, never exported. `loaded` stays false until
 * the read lands, so a tip already dismissed never flashes on launch.
 */
const STORAGE_KEY = 'tips.seen';

type Tips = {
  seen: ReadonlySet<string>;
  loaded: boolean;
  dismiss: (id: string) => void;
  reset: () => void;
};

const Ctx = createContext<Tips>({
  seen: new Set(),
  loaded: false,
  dismiss: () => {},
  reset: () => {},
});

export function TipsProvider({ children }: { children: React.ReactNode }) {
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        const ids: unknown = v ? JSON.parse(v) : [];
        if (Array.isArray(ids)) setSeen(new Set(ids.filter((x) => typeof x === 'string')));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = (next: ReadonlySet<string>) => {
    setSeen(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  };

  const dismiss = (id: string) => save(new Set([...seen, id]));
  const reset = () => save(new Set());

  return <Ctx.Provider value={{ seen, loaded, dismiss, reset }}>{children}</Ctx.Provider>;
}

export const useTips = () => useContext(Ctx);
