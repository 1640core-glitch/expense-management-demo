import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, ReactNode } from 'react';

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

const getSystemResolved = (): Resolved => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialMode = (): Mode => {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return 'system';
};

const computeResolved = (mode: Mode): Resolved => {
  if (mode === 'system') return getSystemResolved();
  return mode;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(getInitialMode);
  const [resolved, setResolved] = useState<Resolved>(() => computeResolved(getInitialMode()));

  useLayoutEffect(() => {
    const next = computeResolved(mode);
    setResolved(next);
    document.documentElement.dataset.theme = next;
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next: Resolved = mql.matches ? 'dark' : 'light';
      setResolved(next);
      document.documentElement.dataset.theme = next;
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((next: Mode) => {
    try {
      if (next === 'system') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // ignore
    }
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
