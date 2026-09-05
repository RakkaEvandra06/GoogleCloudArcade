'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useLang } from '@/lib/LanguageContext';
import { loadAdminAuth, saveAdminAuth, clearAdminAuth, pruneExpiredAuth, authExpiresIn } from '@/lib/localAuth';
import { ShieldLockIcon, LockIcon, CheckCircleIcon, XIcon } from '@/components/Icons';

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useLang();
  const [secret,    setSecret]    = useState('');
  const [loading,   setLoad]      = useState(false);
  const [err,       setErr]       = useState('');
  const [savedAuth, setSavedAuth] = useState<{ secret: string; savedAt: number } | null>(null);

  useEffect(() => {
    pruneExpiredAuth();
    const a = loadAdminAuth();
    if (a) { setSavedAuth(a); setSecret(a.secret); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setErr(''); setLoad(true);
    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'admin', secret }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('common.error'));
      saveAdminAuth(secret.trim());
      router.push('/admin');
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : t('common.error')); setLoad(false); }
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <Header currentView="dashboard" onViewChange={() => {}} isLoggedIn={false} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">

        {/* ── Hero ── */}
        <div className="text-center mb-8 animate-fade-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(234,67,53,0.10)', border: '1px solid rgba(234,67,53,0.30)' }}>
            <ShieldLockIcon size={28} style={{ color: 'var(--red)' }} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--foreground)' }}>
            {t('login.admin.title')}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{t('login.admin.subtitle')}</p>
        </div>

        <div className="w-full max-w-sm animate-scale-in space-y-3" style={{ animationDelay: '80ms' }}>

          {/* ── Login card ── */}
          <div className="glass-card" style={{ background: 'rgba(234,67,53,0.06)', border: '1px solid rgba(234,67,53,0.28)' }}>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"
              style={{ color: 'var(--red)' }}>
              <LockIcon size={12} aria-hidden="true" />
              {t('login.admin.label')}
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>{t('login.admin.hint')}</p>

            {/* Saved auth notice */}
            {savedAuth && (
              <div className="mb-4 px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-[9px] font-mono"
                style={{ background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.20)' }}>
                <span className="flex items-center gap-1.5" style={{ color: 'var(--red)' }}>
                  <CheckCircleIcon size={12} style={{ flexShrink: 0 }} />
                  {t('auth.saved_admin')}
                </span>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-dim)' }}>{t('auth.expiry_note')} · {authExpiresIn(savedAuth.savedAt)}</span>
                  <button
                    onClick={() => { clearAdminAuth(); setSavedAuth(null); setSecret(''); }}
                    className="flex items-center justify-center w-5 h-5 rounded hover:opacity-70 transition-opacity"
                    style={{ background: 'var(--surface)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}
                    aria-label="Clear saved session"
                  >
                    <XIcon size={9} />
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                value={secret}
                onChange={e => { setSecret(e.target.value); setErr(''); }}
                placeholder={t('login.admin.placeholder')}
                className="glass-input"
                required
                disabled={loading}
                autoFocus={!savedAuth}
                aria-label="Admin secret key"
              />
              {err && (
                <p className="text-[10px] font-mono px-3 py-2 rounded-lg" role="alert"
                  style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
                  {err}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !secret.trim()}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                style={{ background: 'var(--red)', borderColor: 'transparent' }}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    {t('login.verifying')}
                  </>
                ) : (
                  <>
                    <LockIcon size={13} aria-hidden="true" />
                    {t('login.admin.submit')}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Footer links ── */}
          <div className="flex justify-center gap-5">
            <a href="/player-login"
              className="text-[10px] font-mono font-bold hover:opacity-70 transition-opacity"
              style={{ color: 'var(--blue)' }}>
              {t('login.player_link')}
            </a>
            <a href="/facilitator-login"
              className="text-[10px] font-mono font-bold hover:opacity-70 transition-opacity"
              style={{ color: 'var(--green)' }}>
              {t('login.facilitator_link')}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
