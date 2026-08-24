'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';
import { LANGS, LANG_META } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { loadAdminAuth, saveAdminAuth, pruneExpiredAuth, authExpiresIn } from '@/lib/localAuth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const [secret,    setSecret]    = useState('');
  const [loading,   setLoad]      = useState(false);
  const [err,       setErr]       = useState('');
  const [savedAuth, setSavedAuth] = useState<{ savedAt: number } | null>(null);

  useEffect(() => {
    pruneExpiredAuth();
    const a = loadAdminAuth();
    if (a) setSavedAuth(a);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setErr(''); setLoad(true);
    try {
      const res  = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'admin', secret }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('common.error'));
      saveAdminAuth();
      router.push('/admin');
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : t('common.error')); setLoad(false); }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12" style={{ position:'relative', zIndex:1 }}>
      <div className="fixed top-4 right-4 flex items-center gap-1 p-1 rounded-lg z-50"
        style={{ background:'var(--surface)', border:'1px solid var(--border-md)' }}>
        {LANGS.map(l => (
          <button key={l} onClick={() => setLang(l as Lang)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono font-bold transition-all"
            style={{ background: lang === l ? 'rgba(234,67,53,0.18)' : 'transparent', color: lang === l ? 'var(--red)' : 'var(--text-dim)' }}>
            <span className="text-[11px]">{LANG_META[l as Lang].flag}</span><span>{l}</span>
          </button>
        ))}
      </div>

      <div className="text-center mb-8 animate-fade-slide-up">
        <div className="text-5xl mb-4 select-none">🔒︎</div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color:'var(--foreground)' }}>{t('login.admin.title')}</h1>
        <p className="text-sm mt-2" style={{ color:'var(--text-muted)' }}>{t('login.admin.subtitle')}</p>
      </div>

      <div className="w-full max-w-sm animate-scale-in space-y-3" style={{ animationDelay:'80ms' }}>
        <div className="glass-card" style={{ background:'rgba(234,67,53,0.06)', border:'1px solid rgba(234,67,53,0.28)' }}>
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1" style={{ color:'var(--red)' }}>{t('login.admin.label')}</p>
          <p className="text-xs mb-5" style={{ color:'var(--text-muted)' }}>{t('login.admin.hint')}</p>

          {savedAuth && (
            <div className="mb-4 px-3 py-2 rounded-lg text-[9px] font-mono"
              style={{ background:'rgba(234,67,53,0.08)', border:'1px solid rgba(234,67,53,0.20)', color:'var(--red)' }}>
              ✓ {t('auth.saved_admin')} · {t('auth.expiry_note')} · {authExpiresIn(savedAuth.savedAt)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" value={secret}
              onChange={e => { setSecret(e.target.value); setErr(''); }}
              placeholder={t('login.admin.placeholder')} className="glass-input"
              required disabled={loading} autoFocus />
            {err && <p className="text-[10px] font-mono px-3 py-2 rounded-lg" role="alert"
              style={{ background:'var(--red-dim)', color:'var(--red)', border:'1px solid var(--red-border)' }}>{err}</p>}
            <button type="submit" disabled={loading || !secret.trim()} className="btn-primary w-full py-2.5"
              style={{ background:'var(--red)' }}>
              {loading ? t('login.verifying') : `🔒︎ ${t('login.admin.submit')}`}
            </button>
          </form>
        </div>
        <div className="flex justify-center gap-5">
          <a href="/player-login" className="text-[10px] font-mono font-bold hover:opacity-70 transition-opacity" style={{ color:'var(--blue)' }}>{t('login.player_link')}</a>
          <a href="/facilitator-login" className="text-[10px] font-mono font-bold hover:opacity-70 transition-opacity" style={{ color:'var(--green)' }}>{t('login.facilitator_link')}</a>
        </div>
      </div>
    </div>
  );
}
