'use client';
import { useLang } from '@/lib/LanguageContext';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ProfileHeader from '@/components/ProfileHeader';
import Dashboard from '@/components/Dashboard';
import Leaderboard from '@/components/Leaderboard';
import { ToastContainer } from '@/components/Toast';
import { touchPlayerAuth } from '@/lib/localAuth';
import type { Participant, Badge } from '@/lib/db';

type View = 'dashboard' | 'leaderboard';
interface ToastItem { id: string; message: string; type: 'success' | 'error' | 'info'; }

interface Props {
  participant: Participant;
  badges:      Badge[];
  participants: Participant[];
  profileUrl:  string;
}

export default function PlayerShell({
  participant:  initParticipant,
  badges:       initBadges,
  participants: initParticipants,
}: Props) {
  const { t } = useLang();
  const router = useRouter();

  /* ── View & data state ── */
  const [view,         setView]         = useState<View>('dashboard');
  const [participant,  setParticipant]  = useState(initParticipant);
  const [badges,       setBadges]       = useState(initBadges);
  const [participants, setParticipants] = useState(initParticipants);

  /* ── Toast system ── */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-4), { id, message, type }]);
  }, []);
  const removeToast = useCallback((id: string) =>
    setToasts(t => t.filter(x => x.id !== id)), []);

  /* ── Sync handler ── */
  const handleSync = useCallback(async () => {
    try {
      const res = await fetch(`/api/participants/${participant.id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed.');
      const data = await res.json();
      if (data.participant) setParticipant(data.participant);
      if (data.badges)      setBadges(data.badges);
      const lr  = await fetch('/api/participants');
      const ld  = lr.ok ? await lr.json() : {};
      if (ld.participants)  setParticipants(ld.participants);
      addToast('Profile synced! ✓', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Sync failed.', 'error');
    }
  }, [participant.id, addToast]);

  /* ── Logout handler ── */
  const handleLogout = useCallback(async () => {
    // Intentionally keep playerAuth in localStorage so the player-login page
    // can pre-fill the URL and name on the next visit — mirrors the facilitator
    // login flow (FacilitatorPanel never calls clearFacAuth on sign-out).
    touchPlayerAuth(); // refresh the 7-day TTL while the session was active
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    router.push('/player-login');
  }, [router]);

  return (
    <div className="min-h-dvh" style={{ position: 'relative', zIndex: 1 }}>
      <Header
        currentView={view}
        onViewChange={setView}
        isLoggedIn
        onSyncSelf={handleSync}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-3">
        <ProfileHeader
          participant={participant}
          badges={badges}
          onResetSession={handleLogout}
          onSync={handleSync}
        />

        {view === 'dashboard'   && (
          <Dashboard participant={participant} badges={badges} />
        )}
        {view === 'leaderboard' && (
          <Leaderboard participants={participants} currentUser={participant} />
        )}
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
