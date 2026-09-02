'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/lib/useTheme';
import { useLang } from '@/lib/LanguageContext';
import { LANGS, LANG_META } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

interface HeaderProps {
  currentView: 'dashboard' | 'leaderboard';
  onViewChange: (v: 'dashboard' | 'leaderboard') => void;
  isLoggedIn: boolean;
  onSyncSelf?: () => Promise<void>; // kept for API compat
}

export default function Header({ currentView, onViewChange, isLoggedIn }: HeaderProps) {

  const { toggle } = useTheme();
  const { t, lang, setLang } = useLang();

  const [isDark,    setIsDark]    = useState(true); // SSR-safe default; corrected on first client effect
  const [time,      setTime]      = useState('');
  const [showLang,  setShowLang]  = useState(false);
  const langRef                   = useRef<HTMLDivElement>(null);

  /* Reactively track data-theme on <html> */
  useEffect(() => {
    const sync = () =>
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    sync(); // immediate correction on mount
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  /* Clock — Jakarta time */
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-GB', {
        hour12: false, timeZone: 'Asia/Jakarta',
      }) + ' WIB');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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
    <header
      className="w-full sticky top-0 z-50"
      style={{
        background: isDark ? 'rgba(9,14,20,0.94)' : 'rgba(250,251,253,0.94)',
        backdropFilter: 'saturate(180%) blur(18px)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: isDark ? '0 1px 0 rgba(255,255,255,0.03)' : '0 1px 0 rgba(0,0,0,0.05)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-3">

        {/* ── Brand ── */}
        {isLoggedIn ? (
          <a href="/dashboard"
            className="flex items-center gap-2.5 shrink-0 select-none no-underline group"
            title="Go to dashboard">
            <div
              className="w-7 h-7 rounded-lg overflow-hidden shrink-0 transition-opacity group-hover:opacity-80"
              style={{ border: `1px solid rgba(66,133,244,0.35)`, background: 'rgba(66,133,244,0.08)' }}
            >
              <img src="/500px.png" alt="" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-sm tracking-tight transition-opacity group-hover:opacity-80"
              style={{ color: 'var(--foreground)' }}>
              {t('header.brand')}&nbsp;<span className="font-mono" style={{ color: 'var(--blue)' }}>{t('header.year')}</span>
            </span>
          </a>
        ) : (
          <div className="flex items-center gap-2.5 shrink-0 select-none">
            <div
              className="w-7 h-7 rounded-lg overflow-hidden shrink-0"
              style={{ border: `1px solid rgba(66,133,244,0.35)`, background: 'rgba(66,133,244,0.08)' }}
            >
              <img src="/500px.png" alt="" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--foreground)' }}>
              {t('header.brand')}&nbsp;<span className="font-mono" style={{ color: 'var(--blue)' }}>{t('header.year')}</span>
            </span>
          </div>
        )}

        {/* ── Nav tabs (desktop) ── */}
        {isLoggedIn && (
          <nav
            className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
          >
            {(['dashboard', 'leaderboard'] as const).map(v => {
              const active = currentView === v;
              return (
                <button
                  key={v}
                  onClick={() => onViewChange(v)}
                  className="px-3.5 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all duration-150"
                  style={
                    active
                      ? { background: isDark ? 'rgba(66,133,244,0.22)' : '#fff', color: 'var(--blue)', boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.12)' }
                      : { color: 'var(--text-muted)', background: 'transparent' }
                  }
                >
                  {v === 'dashboard' ? `☰ ${t('nav.dashboard')}` : `🌐︎ ${t('nav.leaderboard')}`}
                </button>
              );
            })}
          </nav>
        )}

        {/* ── Right cluster ── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Clock */}
          <span className="hidden lg:block font-mono text-[10px] tabular-nums" style={{ color: 'var(--text-dim)' }}>
            {time}
          </span>

          {/* Live dot */}
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            <span className="w-1.5 h-1.5 rounded-full animate-live-blip" style={{ background: 'var(--green)' }} />
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--green)' }}>
              {t('nav.live')}
            </span>
          </div>

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
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none" className="transition-transform duration-200" style={{ transform: showLang ? 'rotate(180deg)' : 'none', opacity: 0.5 }}>
                <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showLang && (
              <div
                role="listbox"
                aria-label={t('nav.select_lang')}
                className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50"
                style={{
                  minWidth: 156,
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
            style={{ background: isDark ? 'rgba(66,133,244,0.30)' : 'rgba(249,171,0,0.25)' }}
          >
            <span className="absolute left-1 text-[9px] select-none" style={{ opacity: isDark ? 1 : 0.3, transition: 'opacity 220ms' }}>🌙</span>
            <span className="absolute right-1 text-[9px] select-none" style={{ opacity: isDark ? 0.3 : 1, transition: 'opacity 220ms' }}>☀️</span>
            <span className="theme-switch-knob" style={{ transform: isDark ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }} />
          </button>
        </div>
      </div>

      {/* ── Mobile nav bar ── */}
      {isLoggedIn && (
        <div className="sm:hidden flex" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}` }}>
          {(['dashboard', 'leaderboard'] as const).map(v => {
            const active = currentView === v;
            return (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className="flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-colors"
                style={{
                  color: active ? 'var(--blue)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${active ? 'var(--blue)' : 'transparent'}`,
                }}
              >
                {v === 'dashboard' ? `☰ ${t('nav.dashboard')}` : `🌐︎ ${t('nav.leaderboard')}`}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
