'use client';
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

function applyTheme(t: Theme) {
  const html = document.documentElement;
  html.setAttribute('data-theme', t);
  // mirror as class so Tailwind's dark: variants work too
  if (t === 'light') { html.classList.add('light'); html.classList.remove('dark'); }
  else               { html.classList.add('dark');  html.classList.remove('light'); }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

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

  return { theme, toggle };
}
