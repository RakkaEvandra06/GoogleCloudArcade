'use client';

import { useState } from 'react';
import { Participant, Badge } from '@/lib/db';
import { ExternalLinkIcon, ExitIcon, UpdateIcon } from '@radix-ui/react-icons';
import { useLang } from '@/lib/LanguageContext';
import SignOutDialog from '@/components/SignOutDialog';

const ACTIVE_START = '2026-07-01';

interface Props {
  participant: Participant;
  badges: Badge[];
  onResetSession?: () => void;
  onSync?: () => Promise<void>;
  savedUrl?: string;
}

export default function ProfileHeader({ participant, badges, onResetSession, onSync }: Props) {
  const [isSyncing, setSync]   = useState(false);
  const [showDialog, setDialog] = useState(false);
  const { t } = useLang();

  const monthly = badges.filter(b => b.earned_date >= ACTIVE_START);
  const games   = monthly.filter(b => b.category === 'game').length;
  const skills  = monthly.filter(b => b.category === 'skill_badge').length;
  const pts     = participant.monthly_points ?? 0;

  const initials = participant.name
    .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  const handleSync = async () => {
    if (!onSync || isSyncing) return;
    setSync(true);
    try { await onSync(); } finally { setSync(false); }
  };

  return (
    <div className="glass-card animate-fade-slide-up"
      style={{ background:'rgba(66,133,244,0.06)', borderColor:'rgba(66,133,244,0.22)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        {/* Avatar + name */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-11 h-11 rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm"
            style={{ background:'rgba(66,133,244,0.15)', border:'2px solid rgba(66,133,244,0.4)' }}>
            {participant.avatar_url
              ? <img src={participant.avatar_url} alt={participant.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              : <span style={{ color:'var(--blue)' }}>{initials}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-mono font-bold uppercase tracking-widest mb-0.5" style={{ color:'var(--blue)' }}>
              {t('profile.role_label')}
            </p>
            <h2 className="text-lg font-black tracking-tight truncate" style={{ color:'var(--foreground)' }}>
              {participant.name}
            </h2>
            <a href={participant.profile_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-mono mt-0.5 transition-colors hover:underline"
              style={{ color:'var(--text-muted)' }}>
              {t('profile.profile_link')} <ExternalLinkIcon className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Stats + actions */}
        <div className="flex flex-col sm:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Pill label={t('profile.pts')}    value={pts.toFixed(1)} color="var(--yellow)" />
            <Pill label={t('profile.games')}  value={String(games)}  color="var(--blue)" />
            <Pill label={t('profile.skills')} value={String(skills)} color="var(--purple)" />
          </div>

            {/* Sync */}
          <div className="flex items-center gap-2">
            {onSync && (
              <button onClick={handleSync} disabled={isSyncing} className="btn-cyan text-[9px] px-3 py-1.5">
                <UpdateIcon className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? t('profile.syncing') : t('profile.sync')}
              </button>
            )}
             {/* Sign Out — opens confirmation dialog */}
            <button onClick={() => setDialog(true)}
              className="btn-ghost text-[9px] px-3 py-1.5 rounded-lg font-mono font-bold uppercase tracking-wider transition-all"
              style={{ background:'var(--red-dim)', color:'var(--red)', border:'1px solid var(--red-border)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity='0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity='1')}>
              <ExitIcon className="w-3 h-3" />
              {t('profile.sign_out')}
            </button>
          </div>

          {participant.last_synced && (
            <p className="text-[9px] font-mono" style={{ color:'var(--theme-accent-dynamic-color-1)' }}>
              {t('profile.last_synced')} {new Date(participant.last_synced).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      <SignOutDialog
        isOpen={showDialog}
        userName={participant.name}
        onCancel={() => setDialog(false)}
        onConfirm={() => { setDialog(false); onResetSession?.(); }}
      />
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg"
      style={{ background:`${color}14`, border:`1px solid ${color}35` }}>
      <span className="font-mono text-base font-black leading-none" style={{ color }}>{value}</span>
      <span className="font-mono text-[9px] font-bold uppercase tracking-widest mt-0.5"
        style={{ color:'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
