import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type Theme, type ThemePreference } from './tokens';

const STORAGE_KEY = 'zenode-theme';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  ready: boolean;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(v: unknown): v is ThemePreference {
  return v === 'dark' || v === 'light' || v === 'auto';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPrefState] = useState<ThemePreference>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => {
        if (alive && isPreference(v)) setPrefState(v);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPrefState(p);
    SecureStore.setItemAsync(STORAGE_KEY, p).catch(() => {});
  }, []);

  const theme = useMemo(() => {
    if (preference === 'light') return lightTheme;
    if (preference === 'dark') return darkTheme;
    return system === 'light' ? lightTheme : darkTheme;
  }, [preference, system]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.canvas).catch(() => {});
  }, [theme.canvas]);

  const value = useMemo(
    () => ({ theme, preference, ready, setPreference }),
    [theme, preference, ready, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeProvider manquant');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}
