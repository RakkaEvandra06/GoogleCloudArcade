'use client';

import { useEffect } from 'react';
import { ExitIcon } from '@radix-ui/react-icons';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/useTheme';

interface SignOutDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  userName?: string;
}

export default function SignOutDialog({ isOpen, onConfirm, onCancel, userName }: SignOutDialogProps) {
  const { t } = useLang();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onCancel]);

  /* Lock background scroll while modal is open */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /**
     * ROOT — fixed stacking-context anchor only.
     */
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-labelledby="signout-title">

      <div
        className="absolute inset-0 overflow-y-auto"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={onCancel}
      >
        {/* CENTERING WRAPPER — min-h-full centres short cards; tall cards scroll */}
        <div className="flex min-h-full items-center justify-center p-4">

          {/* DIALOG CARD */}
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 animate-scale-in"
            style={{
              background: isDark ? 'rgba(13,19,25,0.98)' : 'rgba(250,251,253,0.98)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
              boxShadow: isDark ? '0 24px 48px rgba(0,0,0,0.6)' : '0 24px 48px rgba(0,0,0,0.14)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(234,67,53,0.10)', border: '1px solid rgba(234,67,53,0.28)' }}
            >
              <ExitIcon className="w-5 h-5" style={{ color: 'var(--red)' }} />
            </div>

            <div className="text-center space-y-1.5">
              <h2
                id="signout-title"
                className="font-black text-xl tracking-tight"
                style={{ color: 'var(--foreground)' }}
              >
                {t('signout.title')}
              </h2>
              {userName && (
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {userName}
                </p>
              )}
              <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {t('signout.desc')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCancel}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                  color: 'var(--text-muted)',
                }}
              >
                {t('signout.cancel')}
              </button>
              <button
                onClick={onConfirm}
                className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'rgba(234,67,53,0.90)',
                  color: '#fff',
                  border: '1px solid rgba(234,67,53,0.70)',
                  boxShadow: '0 2px 8px rgba(234,67,53,0.30)',
                }}
              >
                <ExitIcon className="w-3.5 h-3.5" />
                {t('signout.confirm')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
