import { createContext, useCallback, useContext, useLayoutEffect, ReactNode } from 'react';

type Mode = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

interface ThemeContextValue {
  mode: Mode;
  resolved: Resolved;
  setMode: (mode: Mode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = 'light';
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const setMode = useCallback((_next: Mode) => {
    // light mode only
  }, []);

  const toggle = useCallback(() => {
    // light mode only
  }, []);

  return (
    <ThemeContext.Provider value={{ mode: 'light', resolved: 'light', setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
