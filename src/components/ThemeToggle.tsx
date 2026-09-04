'use client';
import { useTheme } from '@/lib/useTheme';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="theme-switch"
      style={{
        background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(66,133,244,0.15)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(66,133,244,0.30)'}`,
      }}
    >
      {/* Sun icon (light mode) */}
      <span
        style={{
          position: 'absolute',
          left: '0.3rem',
          fontSize: '0.6rem',
          lineHeight: 1,
          opacity: isDark ? 0.35 : 1,
          transition: 'opacity 200ms ease',
          userSelect: 'none',
        }}
      >
        ☀
      </span>

      {/* Moon icon (dark mode) */}
      <span
        style={{
          position: 'absolute',
          right: '0.3rem',
          fontSize: '0.55rem',
          lineHeight: 1,
          opacity: isDark ? 1 : 0.35,
          transition: 'opacity 200ms ease',
          userSelect: 'none',
        }}
      >
        ☾
      </span>

      {/* Sliding knob */}
      <span
        className="theme-switch-knob"
        style={{
          left: isDark ? 'calc(100% - 1.2rem)' : '0.2rem',
          background: isDark ? '#c7d2fe' : '#fff',
        }}
      />
    </button>
  );
}
