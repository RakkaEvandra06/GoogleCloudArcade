'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Participant, Badge } from '@/lib/db';
import Header from '@/components/Header';
import ProfileHeader from '@/components/ProfileHeader';
import Dashboard from '@/components/Dashboard';
import Leaderboard from '@/components/Leaderboard';
import { ToastContainer } from '@/components/Toast';
import { savePlayerAuth, touchPlayerAuth, clearPlayerAuth, pruneExpiredAuth } from '@/lib/localAuth';
import { useLang } from '@/lib/LanguageContext';

interface Props { participant:Participant; badges:Badge[]; participants:Participant[]; profileUrl:string; }

interface Toast { id:string; message:string; type:'success'|'error'|'info'; }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message:string, type:Toast['type']='info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-4), { id, message, type }]);
  }, []);
  const remove = useCallback((id:string) => setToasts(t => t.filter(x => x.id!==id)), []);
  return { toasts, add, remove };
}

type View = 'dashboard'|'leaderboard';

export default function PlayerDashboardClient({ participant: initialP, badges: initialB, participants: initialParts, profileUrl }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [view, setView]          = useState<View>('dashboard');
  const [participant, setP]      = useState(initialP);
  const [badges, setB]           = useState(initialB);
  const [participants, setParts] = useState(initialParts);
  const { toasts, add: addToast, remove: removeToast } = useToast();

  /* Persist URL on mount, prune stale entries */
  useEffect(() => {
    pruneExpiredAuth();
    if (profileUrl) savePlayerAuth(profileUrl, initialP.name);
  }, [profileUrl, initialP.name]);

  const handleSync = useCallback(async () => {
    try {
      const res  = await fetch(`/api/participants/${participant.id}`, { method:'POST' });
      if (!res.ok) throw new Error('Sync failed.');
      const data = await res.json();
      setP(data.participant ?? participant);
      setB(data.badges ?? badges);
      const lr = await fetch('/api/participants');
      const ld = await lr.json();
      setParts(ld.participants ?? participants);
      touchPlayerAuth(); // Refresh 7-day expiry on each sync
      addToast(t('profile.sync') + ' ✓','success');
    } catch (e: unknown) { addToast(e instanceof Error ? e.message : t('common.error'),'error'); }
  }, [participant, badges, participants, addToast]);

  const handleSignOut = useCallback(async () => {
    // Keep URL in localStorage — user can quickly re-login
    // clearPlayerAuth() is NOT called so their URL is preserved
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/player-login');
  }, [router]);

  return (
    <div className="min-h-dvh" style={{ position:'relative', zIndex:1 }}>
      <Header currentView={view} onViewChange={setView} isLoggedIn onSyncSelf={handleSync} />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-3">
        <ProfileHeader participant={participant} badges={badges} onSync={handleSync} savedUrl={profileUrl} onResetSession={handleSignOut} />
        {view==='dashboard'   && <Dashboard participant={participant} badges={badges} />}
        {view==='leaderboard' && <Leaderboard participants={participants} currentUser={participant} />}
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
