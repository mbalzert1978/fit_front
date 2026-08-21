import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { themes, defaultMode, type Theme, type ThemeMode } from '../theme';

type Ctx = { theme: Theme; mode: ThemeMode; setMode: (m: ThemeMode) => void };

const ThemeContext = createContext<Ctx>({ theme: themes[defaultMode], mode: defaultMode, setMode: () => {} });

/**
 * Hält nur den aktiven Wert; gespeichert wird der Modus serverseitig über
 * `/preferences`, und die Mutation in den Einstellungen ruft danach `setMode`.
 */
export function ThemeProvider({ children, initialMode = defaultMode }: { children: React.ReactNode; initialMode?: ThemeMode }) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);
  const value = useMemo(() => ({ theme: themes[mode], mode, setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeMode() {
  const { mode, setMode } = useContext(ThemeContext);
  return { mode, setMode };
}
