'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

function applyTheme(t: Theme) {
  const html = document.documentElement;
  html.setAttribute('data-theme', t);
  if (t === 'light') { html.classList.add('light');  html.classList.remove('dark'); }
  else               { html.classList.add('dark');   html.classList.remove('light'); }
}

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    const stored = (localStorage.getItem('arcade-theme') as Theme | null) ?? 'dark';
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('arcade-theme', next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Use inside any client component to get current theme + toggle. */
export function useTheme() {
  return useContext(ThemeContext);
}
