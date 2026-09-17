'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type Lang, LANGS, t as rawT, getMonthFull, getMonthShort } from './i18n';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  monthFull: string[];
  monthShort: string[];
}

const LangContext = createContext<LangContextValue>({
  lang: 'EN',
  setLang: () => {},
  t: key => key,
  monthFull: [],
  monthShort: [],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('EN');

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    const stored = localStorage.getItem('arcade_lang') as Lang | null;
    if (stored && LANGS.includes(stored)) setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('arcade_lang', l);
    /* Update <html lang="…"> for screen-readers */
    const meta = { EN: 'en', ID: 'id', JP: 'ja' }[l];
    document.documentElement.lang = meta;
  }, []);

  const translate = useCallback((key: string) => rawT(key, lang), [lang]);

  const value: LangContextValue = {
    lang,
    setLang,
    t: translate,
    monthFull: getMonthFull(lang),
    monthShort: getMonthShort(lang),
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Use inside any client component to get current language + translate. */
export function useLang() {
  return useContext(LangContext);
}

export type { Lang };
