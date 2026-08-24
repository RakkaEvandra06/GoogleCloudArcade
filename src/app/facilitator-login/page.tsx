'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/LanguageContext';
import { LANGS, LANG_META } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { loadFacAuth, saveFacAuth, clearFacAuth, pruneExpiredAuth, authExpiresIn } from '@/lib/localAuth';

export default function FacilitatorLoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
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
      const res  = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'facilitator', code: code.trim().toUpperCase() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('common.error'));
      saveFacAuth(code.trim().toUpperCase(), data.name);
      router.push('/facilitator');
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : t('common.error')); setLoad(false); }
  };

  const features: Record<Lang, string[]> = {
    EN: ['Member stats dashboard & milestone tracker','CSV import with duplicate validation','Individual & bulk sync + upload history','Progress report via email (Resend)'],
    ID: ['Dashboard statistik anggota & milestone','Import CSV dengan validasi duplikat','Sync individu & massal + riwayat upload','Progress report via email (Resend)'],
    JP: ['メンバー統計ダッシュボード＆マイルストーン','重複検証付きCSVインポート','個別・一括同期＋アップロード履歴','メール（Resend）による進捗レポート'],
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12" style={{ position:'relative', zIndex:1 }}>
      <div className="fixed top-4 right-4 flex items-center gap-1 p-1 rounded-lg z-50"
        style={{ background:'var(--surface)', border:'1px solid var(--border-md)' }}>
        {LANGS.map(l => (
          <button key={l} onClick={() => setLang(l as Lang)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono font-bold transition-all"
            style={{ background: lang === l ? 'rgba(52,168,83,0.18)' : 'transparent', color: lang === l ? 'var(--green)' : 'var(--text-dim)' }}>
            <span className="text-[11px]">{LANG_META[l as Lang].flag}</span><span>{l}</span>
          </button>
        ))}
      </div>

      <div className="text-center mb-8 animate-fade-slide-up">
        <div className="text-5xl mb-4 select-none">𖨆</div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color:'var(--foreground)' }}>{t('login.fac.title')}</h1>
        <p className="text-sm mt-2" style={{ color:'var(--text-muted)' }}>{t('login.fac.subtitle')}</p>
      </div>

      <div className="w-full max-w-sm space-y-3 animate-scale-in" style={{ animationDelay:'80ms' }}>
        <div className="glass-card" style={{ background:'rgba(52,168,83,0.06)', border:'1px solid rgba(52,168,83,0.28)' }}>
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1" style={{ color:'var(--green)' }}>
            🗝 {t('login.fac.label')}
          </p>
          <p className="text-xs mb-5" style={{ color:'var(--text-muted)' }}>{t('login.fac.hint')}</p>

          {savedAuth && (
            <div className="mb-4 px-3 py-2 rounded-lg flex items-center justify-between text-[9px] font-mono"
              style={{ background:'rgba(52,168,83,0.08)', border:'1px solid rgba(52,168,83,0.20)' }}>
              <span style={{ color:'var(--green)' }}>✓ {t('auth.saved_fac')}{savedAuth.name ? ` · ${savedAuth.name}` : ''}</span>
              <div className="flex items-center gap-2">
                <span style={{ color:'var(--text-dim)' }}>{t('auth.expiry_note')} · {authExpiresIn(savedAuth.savedAt)}</span>
                <button onClick={() => { clearFacAuth(); setSavedAuth(null); setCode(''); }}
                  className="text-[8px] px-1.5 py-0.5 rounded hover:opacity-70 transition-opacity"
                  style={{ background:'var(--surface)', color:'var(--text-dim)' }}>✕</button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setErr(''); }}
              placeholder={t('login.fac.placeholder')}
              className="glass-input font-mono tracking-widest text-center text-sm"
              required disabled={loading} autoFocus={!savedAuth} />
            {err && <p className="text-[10px] font-mono px-3 py-2 rounded-lg" role="alert"
              style={{ background:'var(--red-dim)', color:'var(--red)', border:'1px solid var(--red-border)' }}>{err}</p>}
            <button type="submit" disabled={loading || !code.trim()} className="btn-primary w-full py-2.5"
              style={{ background:'var(--green)' }}>
              {loading ? t('login.verifying') : `🗝 ${t('login.fac.submit')}`}
            </button>
          </form>
        </div>

        <div className="p-3 rounded-xl text-[10px] font-mono space-y-1"
          style={{ background:'var(--blue-dim)', border:'1px solid var(--blue-border)', color:'var(--text-muted)' }}>
          <p className="font-bold mb-2" style={{ color:'var(--blue)' }}>{t('login.fac.features')}</p>
          {features[lang].map((f, i) => <p key={i}>• {f}</p>)}
        </div>

        <div className="flex justify-center gap-5 pt-1">
          <a href="/player-login" className="text-[10px] font-mono font-bold hover:opacity-70 transition-opacity" style={{ color:'var(--blue)' }}>{t('login.player_link')}</a>
          <a href="/admin-login" className="text-[10px] font-mono font-bold hover:opacity-70 transition-opacity" style={{ color:'var(--red)' }}>{t('login.admin_link')}</a>
        </div>
      </div>
    </div>
  );
}
