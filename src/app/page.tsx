'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import ProfileHeader from '@/components/ProfileHeader';
import Dashboard from '@/components/Dashboard';
import FacilitatorPanel from '@/components/FacilitatorPanel';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import { ToastContainer } from '@/components/Toast';
import { Participant, Badge } from '@/lib/db';
import { savePlayerAuth, pruneExpiredAuth } from '@/lib/localAuth';

type View = 'dashboard' | 'leaderboard';
interface ToastItem { id: string; message: string; type: 'success' | 'error' | 'info'; }

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const add = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-4), { id, message, type }]);
  }, []);
  const remove = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);
  return { toasts, add, remove };
}

const STEPS = [
  'Connecting to Skills Boost…',
  'Reading your public profile…',
  'Counting badges & points…',
  'Loading the leaderboard…',
  'Almost done…',
];

/* Feature cards shown on the login page */
const FEATURES = [
  { icon: '▶', title: 'Game Tracks',      desc: '6 active July 2026 tracks with badge images' },
  { icon: '★', title: 'Badge Catalog',    desc: '95+ FastTrack skill badges searchable by level' },
  { icon: '↗', title: 'Tier Tracker',     desc: 'Trooper → Ranger → Champion → Legend progress' },
  { icon: '𐃯', title: 'Live Leaderboard', desc: 'Real-time updates across participants' },
];

/* Badge image strip shown on the login hero */
const TRACK_IMGS = [
  'https://cdn.qwiklabs.com/fRCfiQc6gVA%2BSEUkSvc7agSfPUGUiHmYaI4kslS9mSw%3D', // Trail
  'https://cdn.qwiklabs.com/vQwBzyge8g7JI%2Fs9rWfu%2BvXJurcIOnP0A9wKR7U4i14%3D', // Adventure
  'https://cdn.qwiklabs.com/yn3KXIRZy6Md4qAEmKiYk6SEuHg0a7gDEaqc2H4o1Cs%3D', // Voyage
  'https://cdn.qwiklabs.com/nXo%2Bc%2FLavbtJXZma1hYLmBxApy6Cr6CZiR1Bnukj5dk%3D', // Base Camp
  'https://cdn.qwiklabs.com/KU0Jp50XMAj26Vmx1iNYlmxJUltgvVVAa3YI0Xgssjg%3D', // Simulator
  'https://cdn.qwiklabs.com/jf0VYLPQlpqie%2FRI4cjTeBwtiL3xPto3PBIM5b8iSzI%3D', // Spans and Plans
];

export default function Home() {
  const [view,           setView]           = useState<View>('dashboard');
  const [profileUrl,     setProfileUrl]     = useState('');
  const [participant,    setParticipant]    = useState<Participant | null>(null);
  const [badges,         setBadges]         = useState<Badge[]>([]);
  const [participants,   setParticipants]   = useState<Participant[]>([]);
  const [isLoading,      setLoading]        = useState(false);
  const [loadingMsg,     setLoadingMsg]     = useState('');
  const [loadingStep,    setLoadingStep]    = useState(0);
  const [sessionChecked, setSessionChecked] = useState(false);
  const { toasts, add: addToast, remove: removeToast } = useToast();

  /* ── Restore session from HTTP-only cookie on first render ── */
  useEffect(() => {
    pruneExpiredAuth();
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { setSessionChecked(true); return; }
        const { session } = await meRes.json();
        if (!session || session.role !== 'player' || !session.participantId) {
          setSessionChecked(true);
          return;
        }
        // Valid session found — silently restore the dashboard
        const [pRes, lRes] = await Promise.all([
          fetch(`/api/participants/${session.participantId}`),
          fetch('/api/participants'),
        ]);
        if (!pRes.ok) { setSessionChecked(true); return; }
        const pData = await pRes.json();
        const lData = lRes.ok ? await lRes.json() : { participants: [] };
        setParticipant(pData.participant ?? null);
        setBadges(pData.badges ?? []);
        setParticipants(lData.participants ?? []);
        if (session.profileUrl) setProfileUrl(session.profileUrl);
      } catch {
        /* Session check failed silently — show login form */
      } finally {
        setSessionChecked(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = profileUrl.trim();
    // Accept both supported domains: cloudskillsboost.google.com and www.skills.google
    const isCloudSkillsBoost = url.includes('cloudskillsboost.google.com/public_profiles/');
    const isSkillsGoogle     = url.includes('skills.google/public_profiles/');
    if (!isCloudSkillsBoost && !isSkillsGoogle) {
      addToast(
        'Please enter a valid Google Skills Boost profile URL',
        'error',
      );
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setLoadingMsg(STEPS[0]);

    const stepTick = setInterval(() => {
      setLoadingStep(s => {
        const next = Math.min(s + 1, STEPS.length - 1);
        setLoadingMsg(STEPS[next]);
        return next;
      });
    }, 1400);

    try {
      // 1. Login via auth endpoint — sets session cookie, scrapes for new users
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'player', profile_url: url }),
      });
      if (!loginRes.ok) throw new Error('Failed to register profile.');
      const loginData = await loginRes.json();

      // 2. Fetch full participant data + badges (session cookie is now set)
      const pRes = await fetch(`/api/participants/${loginData.participantId}`);
      if (!pRes.ok) throw new Error('Failed to load profile data.');
      const pData = await pRes.json();

      // 3. Fetch leaderboard
      const lRes  = await fetch('/api/participants');
      const lData = await lRes.json();

      setParticipant(pData.participant);
      setBadges(pData.badges ?? []);
      setParticipants(lData.participants ?? []);
      // Persist URL so session can be restored on next visit
      if (pData.participant) savePlayerAuth(url, pData.participant.name);
      addToast(`Welcome, ${pData.participant?.name || loginData.name}! Profile loaded.`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Something went wrong.', 'error');
    } finally {
      clearInterval(stepTick);
      setLoading(false);
    }
  };

  const handleSync = useCallback(async () => {
    if (!participant) return;
    try {
      const res  = await fetch(`/api/participants/${participant.id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed.');
      const data = await res.json();
      setParticipant(data.participant ?? participant);
      setBadges(data.badges ?? badges);
      const lr = await fetch('/api/participants');
      const ld = await lr.json();
      setParticipants(ld.participants ?? participants);
      addToast('Profile synced!', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Sync failed.', 'error');
    }
  }, [participant, badges, participants, addToast]);

  const handleReset = async () => {
    // Clear the server-side session cookie before wiping client state
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setParticipant(null); setBadges([]); setParticipants([]);
    setProfileUrl(''); setView('dashboard');
  };

  /* ── LOGGED IN ── */
  /* Session check gate — prevents login-form flash while cookie is verified */
  if (!sessionChecked) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ position: 'relative', zIndex: 1 }}>
        <span className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--blue)' }} />
      </div>
    );
  }

  if (participant) {
    return (
      <div className="min-h-dvh" style={{ position: 'relative', zIndex: 1 }}>
        <Header currentView={view} onViewChange={setView} isLoggedIn onSyncSelf={handleSync} />
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-3">
          <ProfileHeader participant={participant} badges={badges} onResetSession={handleReset} onSync={handleSync} />
          {view === 'dashboard'   && <Dashboard participant={participant} badges={badges} />}
          {view === 'leaderboard' && <FacilitatorPanel participants={participants} currentUser={participant} />}
        </main>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  /* ── LOGIN ── */
  return (
    <div className="min-h-dvh flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <Header currentView="dashboard" onViewChange={() => {}} isLoggedIn={false} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-10 max-w-lg animate-fade-slide-up">
          {/* Active badge strip */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {TRACK_IMGS.map((src, i) => (
              <img key={i} src={src} alt="Arcade badge"
                className="w-9 h-9 object-contain rounded-lg"
                style={{ background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.22)', animationDelay: `${i * 60}ms` }}
                loading="lazy"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ))}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[10px] font-mono font-bold uppercase tracking-widest"
            style={{ background: 'rgba(66,133,244,0.10)', border: '1px solid rgba(66,133,244,0.25)', color: 'var(--blue)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-live-blip" style={{ background: 'var(--green)' }} />
            Jul 13 – Sep 14, 2026
          </div>

          <h1 className="text-5xl font-black tracking-tight mb-2" style={{ color: 'var(--foreground)' }}>
            Arcade&nbsp;<span style={{ color: 'var(--blue)' }}>Track</span>&nbsp;2026
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Your Google Cloud Arcade dashboard. Track badges, monitor tier eligibility, hit Facilitator milestones, and compete on the live leaderboard.
          </p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-md animate-scale-in" style={{ animationDelay: '120ms' }}>
          <div className="glass-neon-cyan">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1"
              style={{ color: 'var(--blue)' }}>Sign In</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Paste your public Google Skills profile URL
            </p>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <input
                  type="url"
                  value={profileUrl}
                  onChange={e => setProfileUrl(e.target.value)}
                  placeholder="https://www.skills.google/public_profiles/…"
                  className="glass-input"
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-[9px] font-mono mt-1.5" style={{ color: 'var(--text-dim)' }}>
                  Your profile must be set to Public in Google Skills settings
                </p>
              </div>

              <button type="submit" disabled={isLoading || !profileUrl.trim()} className="btn-primary w-full">
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    {loadingMsg || 'Loading…'}
                  </>
                ) : '</> Load My Dashboard'}
              </button>

              {isLoading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span>Progress</span>
                    <span>{Math.round((loadingStep / (STEPS.length - 1)) * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(loadingStep / (STEPS.length - 1)) * 100}%`,
                        background: 'var(--blue)',
                      }} />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Feature grid */}
          <div className="text-center grid grid-cols-2 gap-2.5 mt-6">
            {FEATURES.map(f => (
              <div key={f.title} className="glass-card py-3 px-3.5">
                <span className="text-lg block mb-1">{f.icon}</span>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--foreground)' }}>{f.title}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-[8px] font-mono mt-6" style={{ color: 'var(--theme-accent-dynamic-color-1)' }}>
            FACILITATOR | RAKKA EVANDRA RAZAAN
          </p>
        </div>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
