import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { DragonAccents, type DragonKey } from '@/theme/dragonsTheme';

/**
 * The app-wide « Apparence » choice: which Great Dragon recolours the primary,
 * or `null` for the DS parchment & gold. A DEVICE preference, not character
 * data — hence AsyncStorage and not SQLite: no migration, never exported.
 */
const STORAGE_KEY = 'theme.dragon';

type AppDragon = { dragon: DragonKey | null; setDragon: (d: DragonKey | null) => void };

const Ctx = createContext<AppDragon>({ dragon: null, setDragon: () => {} });

export function AppDragonProvider({ children }: { children: React.ReactNode }) {
  const [dragon, setState] = useState<DragonKey | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        // A key from an older build that no longer exists falls back to gold.
        if (v && v in DragonAccents) setState(v as DragonKey);
      })
      .catch(() => {});
  }, []);

  const setDragon = (d: DragonKey | null) => {
    setState(d);
    void (d ? AsyncStorage.setItem(STORAGE_KEY, d) : AsyncStorage.removeItem(STORAGE_KEY)).catch(
      () => {},
    );
  };

  return <Ctx.Provider value={{ dragon, setDragon }}>{children}</Ctx.Provider>;
}

export const useAppDragon = () => useContext(Ctx);
