'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ToastContainer } from '@/components/Toast';
import { savePlayerAuth, pruneExpiredAuth } from '@/lib/localAuth';
import { useLang } from '@/lib/LanguageContext';
import type { Lang } from '@/lib/i18n';

interface ToastItem { id: string; message: string; type: 'success'|'error'|'info'; }
function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const add = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-4), { id, message, type }]);
  }, []);
  const remove = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);
  return { toasts, add, remove };
}

const TRACK_IMGS = [
  'https://cdn.qwiklabs.com/fRCfiQc6gVA%2BSEUkSvc7agSfPUGUiHmYaI4kslS9mSw%3D',
  'https://cdn.qwiklabs.com/vQwBzyge8g7JI%2Fs9rWfu%2BvXJurcIOnP0A9wKR7U4i14%3D',
  'https://cdn.qwiklabs.com/yn3KXIRZy6Md4qAEmKiYk6SEuHg0a7gDEaqc2H4o1Cs%3D',
  'https://cdn.qwiklabs.com/nXo%2Bc%2FLavbtJXZma1hYLmBxApy6Cr6CZiR1Bnukj5dk%3D',
  'https://cdn.qwiklabs.com/KU0Jp50XMAj26Vmx1iNYlmxJUltgvVVAa3YI0Xgssjg%3D',
  'https://cdn.qwiklabs.com/jf0VYLPQlpqie%2FRI4cjTeBwtiL3xPto3PBIM5b8iSzI%3D',
];

export default function PlayerLoginPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [profileUrl,     setProfileUrl]     = useState('');
  const [isLoading,      setLoading]        = useState(false);
  const [loadingMsg,     setLoadingMsg]     = useState('');
  const [loadingStep,    setLoadingStep]    = useState(0);
  const [sessionChecked, setSessionChecked] = useState(false);
  const { toasts, add: addToast, remove: removeToast } = useToast();

  const STEPS = (l: Lang) => [
    t('player.step.1'), t('player.step.2'), t('player.step.3'),
    t('player.step.4'), t('player.step.5'),
  ];

  const FEATURES = [
    { icon: '▶', titleKey: 'player.feat.tracks.title',  descKey: 'player.feat.tracks.desc'  },
    { icon: '★', titleKey: 'player.feat.catalog.title', descKey: 'player.feat.catalog.desc' },
    { icon: '↗', titleKey: 'player.feat.tier.title',    descKey: 'player.feat.tier.desc'    },
    { icon: '𐃯', titleKey: 'player.feat.lb.title',      descKey: 'player.feat.lb.desc'      },
  ];

  useEffect(() => {
    pruneExpiredAuth();
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { setSessionChecked(true); return; }
        const { session } = await meRes.json();
        if (session?.role === 'player' && session?.participantId) {
          router.push('/dashboard'); return;
        }
      } catch { /* Show login form on any error */ }
      setSessionChecked(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = profileUrl.trim();
    if (!url.includes('cloudskillsboost.google.com/public_profiles/') &&
        !url.includes('skills.google/public_profiles/')) {
      addToast(t('login.player.public_note'), 'error');
      return;
    }
    setLoading(true); setLoadingStep(0);
    const steps = STEPS(lang);
    setLoadingMsg(steps[0]);
    const stepTick = setInterval(() => {
      setLoadingStep(s => {
        const next = Math.min(s + 1, steps.length - 1);
        setLoadingMsg(steps[next]);
        return next;
      });
    }, 1400);
    try {
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'player', profile_url: url }),
      });
      if (!loginRes.ok) throw new Error(t('common.error'));
      const loginData = await loginRes.json();
      savePlayerAuth(url, loginData.name);
      router.push('/dashboard');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : t('common.error'), 'error');
    } finally { clearInterval(stepTick); setLoading(false); }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ position:'relative', zIndex:1 }}>
        <span className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor:'var(--border-md)', borderTopColor:'var(--blue)' }} />
      </div>
    );
  }

  const steps = STEPS(lang);

  return (
    <div className="min-h-dvh flex flex-col" style={{ position:'relative', zIndex:1 }}>
      <Header currentView="dashboard" onViewChange={() => {}} isLoggedIn={false} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10 max-w-lg animate-fade-slide-up">
          <div className="flex items-center justify-center gap-2 mb-6">
            {TRACK_IMGS.map((src, i) => (
              <img key={i} src={src} alt="Arcade badge"
                className="w-9 h-9 object-contain rounded-lg"
                style={{ background:'rgba(66,133,244,0.10)', border:'1px solid rgba(66,133,244,0.22)' }}
                loading="lazy"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            ))}
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[10px] font-mono font-bold uppercase tracking-widest"
            style={{ background:'rgba(66,133,244,0.10)', border:'1px solid rgba(66,133,244,0.25)', color:'var(--blue)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-live-blip" style={{ background:'var(--green)' }} />
            {t('player.period')}
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-2" style={{ color:'var(--foreground)' }}>
            Arcade&nbsp;<span style={{ color:'var(--blue)' }}>Track</span>&nbsp;2026
          </h1>
          <p className="text-sm" style={{ color:'var(--text-muted)', lineHeight:1.7 }}>
            {t('player.hero_desc')}
          </p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-md animate-scale-in" style={{ animationDelay:'120ms' }}>
          <div className="glass-neon-cyan">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1"
              style={{ color:'var(--blue)' }}>{t('player.sign_in_label')}</p>
            <p className="text-xs mb-4" style={{ color:'var(--text-muted)' }}>
              {t('player.url_hint')}
            </p>
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <input type="url" value={profileUrl}
                  onChange={e => setProfileUrl(e.target.value)}
                  placeholder={t('login.player.placeholder')}
                  className="glass-input" required disabled={isLoading} autoFocus />
                <p className="text-[9px] font-mono mt-1.5" style={{ color:'var(--text-dim)' }}>
                  {t('login.player.public_note')}
                </p>
              </div>
              <button type="submit" disabled={isLoading || !profileUrl.trim()} className="btn-primary w-full">
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                      style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff' }} />
                    {loadingMsg || t('common.loading')}
                  </>
                ) : t('player.btn')}
              </button>
              {isLoading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-mono" style={{ color:'var(--text-muted)' }}>
                    <span>{t('login.player.progress')}</span>
                    <span>{Math.round((loadingStep / (steps.length - 1)) * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--surface-hover)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width:`${(loadingStep / (steps.length - 1)) * 100}%`, background:'var(--blue)' }} />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-2.5 mt-6">
            {FEATURES.map(f => (
              <div key={f.titleKey} className="glass-card py-3 px-3.5 text-center">
                <span className="text-lg block mb-1">{f.icon}</span>
                <p className="text-xs font-semibold mb-0.5" style={{ color:'var(--foreground)' }}>{t(f.titleKey)}</p>
                <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>{t(f.descKey)}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-[8px] font-mono mt-4"
            style={{ color:'var(--theme-accent-dynamic-color-1)' }}>
            {t('player.footer')}
          </p>
        </div>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
