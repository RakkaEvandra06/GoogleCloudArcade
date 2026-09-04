'use client';
import { useRef, useState, useEffect } from 'react';
import { useTheme } from '@/lib/useTheme';
import { useLang } from '@/lib/LanguageContext';
import { LANGS, LANG_META, type Lang } from '@/lib/i18n';

export default function ThemeLangToggle() {
  const { theme, toggle } = useTheme();
  const { lang, setLang, t }  = useLang();
  const isDark = theme === 'dark';

  const [showLang, setShowLang] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node))
        setShowLang(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLang = (l: Lang) => { setLang(l); setShowLang(false); };

  return (
    <div className="flex items-center gap-2">
      {/* ── Language picker ── */}
      <div className="relative" ref={langRef}>
        <button
          onClick={() => setShowLang(v => !v)}
          aria-haspopup="listbox"
          aria-expanded={showLang}
          aria-label={t('nav.select_lang')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors duration-150"
          style={{
            background: showLang
              ? isDark ? 'rgba(66,133,244,0.20)' : 'rgba(66,133,244,0.12)'
              : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            border: `1px solid ${showLang ? 'rgba(66,133,244,0.35)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            color: showLang ? 'var(--blue)' : 'var(--text-muted)',
          }}
        >
          <span className="text-[12px] leading-none">{LANG_META[lang].flag}</span>
          <span className="tracking-widest">{lang}</span>
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none"
            className="transition-transform duration-200"
            style={{ transform: showLang ? 'rotate(180deg)' : 'none', opacity: 0.5 }}>
            <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showLang && (
          <div
            role="listbox"
            aria-label={t('nav.select_lang')}
            className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-[9999]"
            style={{
              minWidth: 148,
              background: isDark ? 'rgba(11,16,22,0.98)' : 'rgba(252,253,255,0.98)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
              boxShadow: isDark
                ? '0 12px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)'
                : '0 12px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              className="px-3 py-2"
              style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
            >
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>
                {t('nav.select_lang')}
              </p>
            </div>

            {LANGS.map(l => {
              const active = lang === l;
              return (
                <button
                  key={l}
                  role="option"
                  aria-selected={active}
                  onClick={() => handleLang(l)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors duration-100"
                  style={{
                    background: active
                      ? isDark ? 'rgba(66,133,244,0.10)' : 'rgba(66,133,244,0.07)'
                      : 'transparent',
                    color: active ? 'var(--blue)' : 'var(--text-muted)',
                  }}
                >
                  <span className="text-[15px] leading-none w-5 text-center select-none">{LANG_META[l].flag}</span>
                  <span className="flex-1 text-left text-[11px] font-medium">{LANG_META[l].name}</span>
                  <span
                    className="font-mono text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded"
                    style={{
                      background: active ? 'rgba(66,133,244,0.15)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      color: active ? 'var(--blue)' : 'var(--text-dim)',
                    }}
                  >
                    {l}
                  </span>
                  {active && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Theme toggle ── */}
      <button
        onClick={toggle}
        aria-label={isDark ? t('header.theme_light') : t('header.theme_dark')}
        className="theme-switch"
        style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(249,171,0,0.25)' }}
      >
        <span className="absolute left-1 text-[9px] select-none" style={{ opacity: isDark ? 1 : 0.3, transition: 'opacity 220ms' }}>🌙</span>
        <span className="absolute right-1 text-[9px] select-none" style={{ opacity: isDark ? 0.3 : 1, transition: 'opacity 220ms' }}>☀️</span>
        <span className="theme-switch-knob" style={{ transform: isDark ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }} />
      </button>
    </div>
  );
}
