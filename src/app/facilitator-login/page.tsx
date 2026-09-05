'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useLang } from '@/lib/LanguageContext';
import type { Lang } from '@/lib/i18n';
import { loadFacAuth, saveFacAuth, clearFacAuth, pruneExpiredAuth, authExpiresIn } from '@/lib/localAuth';
import {
  UsersIcon, KeyIcon, CheckCircleIcon, XIcon,
  ChartBarIcon, UploadIcon, MailIcon, ClockIcon,
} from '@/components/Icons';

const FEATURE_ICONS = [ChartBarIcon, UploadIcon, ClockIcon, MailIcon];

export default function FacilitatorLoginPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [code,      setCode]      = useState('');
  const [loading,   setLoad]      = useState(false);
  const [err,       setErr]       = useState('');
  const [savedAuth, setSavedAuth] = useState<{ code: string; name?: string; savedAt: number } | null>(null);

  useEffect(() => {
    pruneExpiredAuth();
    const stored = loadFacAuth();
    if (stored) { setSavedAuth(stored); setCode(stored.code); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setErr(''); setLoad(true);
    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'facilitator', code: code.trim().toUpperCase() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('common.error'));
      saveFacAuth(code.trim().toUpperCase(), data.name);
      router.push('/facilitator');
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : t('common.error')); setLoad(false); }
  };

  const features: Record<Lang, string[]> = {
    EN: ['Member stats dashboard & milestone tracker', 'CSV import with duplicate validation', 'Individual & bulk sync + upload history', 'Progress report via email (Resend)'],
    ID: ['Dashboard statistik anggota & milestone', 'Import CSV dengan validasi duplikat', 'Sync individu & massal + riwayat upload', 'Progress report via email (Resend)'],
    JP: ['メンバー統計ダッシュボード＆マイルストーン', '重複検証付きCSVインポート', '個別・一括同期＋アップロード履歴', 'メール（Resend）による進捗レポート'],
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <Header currentView="dashboard" onViewChange={() => {}} isLoggedIn={false} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">

        {/* ── Hero ── */}
        <div className="text-center mb-8 animate-fade-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(52,168,83,0.12)', border: '1px solid rgba(52,168,83,0.30)' }}>
            <UsersIcon size={28} style={{ color: 'var(--green)' }} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--foreground)' }}>
            {t('login.fac.title')}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{t('login.fac.subtitle')}</p>
        </div>

        <div className="w-full max-w-sm space-y-3 animate-scale-in" style={{ animationDelay: '80ms' }}>

          {/* ── Login card ── */}
          <div className="glass-card" style={{ background: 'rgba(52,168,83,0.06)', border: '1px solid rgba(52,168,83,0.28)' }}>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"
              style={{ color: 'var(--green)' }}>
              <KeyIcon size={12} aria-hidden="true" />
              {t('login.fac.label')}
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>{t('login.fac.hint')}</p>

            {/* Saved auth notice */}
            {savedAuth && (
              <div className="mb-4 px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-[9px] font-mono"
                style={{ background: 'rgba(52,168,83,0.08)', border: '1px solid rgba(52,168,83,0.20)' }}>
                <span className="flex items-center gap-1.5" style={{ color: 'var(--green)' }}>
                  <CheckCircleIcon size={12} style={{ flexShrink: 0 }} />
                  {t('auth.saved_fac')}{savedAuth.name ? ` · ${savedAuth.name}` : ''}
                </span>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-dim)' }}>{t('auth.expiry_note')} · {authExpiresIn(savedAuth.savedAt)}</span>
                  <button
                    onClick={() => { clearFacAuth(); setSavedAuth(null); setCode(''); }}
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
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setErr(''); }}
                placeholder={t('login.fac.placeholder')}
                className="glass-input font-mono tracking-widest text-center text-sm"
                required
                disabled={loading}
                autoFocus={!savedAuth}
                aria-label="Facilitator access code"
              />
              {err && (
                <p className="text-[10px] font-mono px-3 py-2 rounded-lg" role="alert"
                  style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
                  {err}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                style={{ background: 'var(--green)', borderColor: 'transparent' }}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    {t('login.verifying')}
                  </>
                ) : (
                  <>
                    <KeyIcon size={13} aria-hidden="true" />
                    {t('login.fac.submit')}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Feature list ── */}
          <div
            className="rounded-xl p-3.5 space-y-2.5"
            style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue-border)' }}
          >
            <p className="text-[10px] font-mono font-bold mb-1" style={{ color: 'var(--blue)' }}>
              {t('login.fac.features')}
            </p>
            {features[lang].map((f, i) => {
              const FeatureIcon = FEATURE_ICONS[i];
              return (
                <div key={i} className="flex items-start gap-2">
                  <FeatureIcon size={13} style={{ color: 'var(--blue)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{f}</p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-5 pt-1">
            <a href="/player-login"
              className="text-[10px] font-mono font-bold hover:opacity-70 transition-opacity"
              style={{ color: 'var(--blue)' }}>
              {t('login.player_link')}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
