'use client';
import { useLang } from '@/lib/LanguageContext';
import { useState, useEffect, useCallback } from 'react';
import { Participant } from '@/lib/db';
import { getSupabaseBrowser } from '@/lib/supabase-client';
import { UpdateIcon } from '@radix-ui/react-icons';

interface Props {
  participants: Participant[];
  currentUser?: Participant | null;
}

const TIERS = [
  { name: 'Legend',   min: 120, color: '#fbbf24', emoji: '🏆' },
  { name: 'Champion', min: 95,  color: '#c084fc', emoji: '👑' },
  { name: 'Ranger',   min: 75,  color: '#22d3ee', emoji: '🎯' },
  { name: 'Trooper',  min: 50,  color: '#4ade80', emoji: '🛡️' },
];

function getTier(pts: number) {
  return TIERS.find(t => pts >= t.min) ?? null;
}

function timeAgo(iso: string | undefined | null, t: (key: string) => string) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return t('lb.time_ago.now');
}

export default function Leaderboard({ participants: initial, currentUser }: Props) {
  const { t } = useLang();
  const [participants, setParticipants] = useState<Participant[]>(initial);
  const [isLive, setIsLive]             = useState(false);
  const [lastPing, setLastPing]         = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter]             = useState('');

  const fetchParticipants = useCallback(async () => {
    try {
      const res  = await fetch('/api/participants');
      const data = await res.json();
      if (Array.isArray(data.participants)) {
        setParticipants(data.participants);
        setLastPing(new Date().toLocaleTimeString());
      }
    } catch { /* silent */ }
  }, []);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchParticipants();
    setIsRefreshing(false);
  };

  // Supabase real-time subscription
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      // Fallback: poll every 30s
      const id = setInterval(fetchParticipants, 30_000);
      return () => clearInterval(id);
    }

    const ch = sb
      .channel('leaderboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        fetchParticipants();
        setLastPing(new Date().toLocaleTimeString());
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => { sb.removeChannel(ch); };
  }, [fetchParticipants]);

  const sorted = [...participants]
    .filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => (b.monthly_points ?? 0) - (a.monthly_points ?? 0));

  const top3 = sorted.slice(0, 3);

  return (
    <div className="space-y-4 animate-fade-slide-up">
      {/* Header */}
      <div className="glass-card" style={{ background:'rgba(192,132,252,0.04)', borderColor:'rgba(192,132,252,0.18)', boxShadow:'4px 4px 0 var(--purple), 0 0 20px rgba(192,132,252,0.12)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color:'var(--purple)' }}>{t('lb.global_title')}</p>
            <p className="font-mono text-xs" style={{ color:'var(--text-muted)' }}>
              {participants.length} participant{participants.length !== 1 ? 's' : ''} · GCAF 2026 · Jul 13 – Sep 14
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: isLive ? 'rgba(74,222,128,0.10)' : 'rgba(100,116,139,0.12)', border:`1px solid ${isLive ? 'rgba(74,222,128,0.3)' : 'rgba(100,116,139,0.2)'}` }}>
              <span className={`w-2 h-2 rounded-full ${isLive ? 'animate-live-blip' : 'opacity-40'}`} style={{ background: isLive ? 'var(--success)' : 'var(--text-muted)' }} />
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: isLive ? 'var(--success)' : 'var(--text-muted)' }}>
                {isLive ? 'Live' : 'Polling'}
              </span>
              {lastPing && <span className="font-mono text-[9px]" style={{ color:'var(--text-muted)' }}>· {lastPing}</span>}
            </div>
            <button onClick={refresh} disabled={isRefreshing} className="btn-ghost text-[9px] px-3 py-1.5">
              <UpdateIcon className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Podium (top 3) */}
      {top3.length >= 3 && (
        <div className="glass-card">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color:'var(--gold)' }}>{t('lb.podium_title')}</p>
          <div className="flex items-end justify-center gap-4">
            {/* 2nd */}
            <PodiumSlot rank={2} p={top3[1]} isMe={top3[1]?.id === currentUser?.id} />
            {/* 1st */}
            <PodiumSlot rank={1} p={top3[0]} isMe={top3[0]?.id === currentUser?.id} />
            {/* 3rd */}
            <PodiumSlot rank={3} p={top3[2]} isMe={top3[2]?.id === currentUser?.id} />
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="glass-card" style={{ padding:'1rem' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>{t('lb.all_participants')}</p>
          <input
            type="text"
            placeholder={t("lb.search_name")}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="glass-input py-2 text-xs w-full sm:w-48"
          />
        </div>

        {/* Table header */}
        <div className="grid font-mono text-[9px] font-bold uppercase tracking-widest px-3 py-2 mb-1 rounded-lg"
          style={{ gridTemplateColumns:'2rem 1fr 5rem 4rem 4rem 4rem', background:'rgba(255,255,255,0.04)', color:'var(--text-muted)' }}>
          <span>#</span>
          <span>{t('lb.participant')}</span>
          <span className="text-right">{t('lb.points')}</span>
          <span className="text-right">{t('lb.col.games')}</span>
          <span className="text-right">{t('lb.col.skills')}</span>
          <span className="text-right">{t('lb.col.synced')}</span>
        </div>

        <div className="space-y-1 max-h-[520px] overflow-y-auto no-scrollbar">
          {sorted.map((p, i) => {
            const pts   = p.monthly_points ?? 0;
            const tier  = getTier(pts);
            const isMe  = p.id === currentUser?.id;
            const rank  = i + 1;
            const medalColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b87333' : undefined;

            return (
              <div key={p.id}
                className="grid items-center px-3 py-2.5 rounded-xl transition-all duration-200 font-mono"
                style={{
                  gridTemplateColumns: '2rem 1fr 5rem 4rem 4rem 4rem',
                  background: isMe ? 'rgba(34,211,238,0.06)' : rank <= 3 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: isMe ? '1px solid rgba(34,211,238,0.3)' : rank <= 3 ? '1px solid rgba(255,255,255,0.09)' : '1px solid transparent',
                  boxShadow: isMe ? '2px 2px 0 rgba(34,211,238,0.2)' : undefined,
                }}>

                {/* Rank */}
                <span className="text-[10px] font-black" style={{ color: medalColor ?? 'var(--text-muted)' }}>
                  {rank <= 3 ? (['🥇','🥈','🥉'][rank-1]) : rank}
                </span>

                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={p.name} avatarUrl={p.avatar_url} size={24} color={tier?.color} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold truncate block" style={{ color: isMe ? 'var(--primary)' : 'var(--foreground)' }}>
                      {p.name} {isMe && <span className="font-mono text-[9px]" style={{ color:'var(--primary)' }}>{t('lb.you_tag')}</span>}
                    </span>
                    {tier && (
                      <span className="text-[9px] font-bold" style={{ color: tier.color }}>{tier.emoji} {tier.name}</span>
                    )}
                  </div>
                </div>

                {/* Points */}
                <span className="text-right text-sm font-black" style={{ color: tier?.color ?? 'var(--foreground)' }}>{pts.toFixed(1)}</span>

                {/* Games */}
                <span className="text-right text-xs font-bold" style={{ color:'var(--primary)' }}>
                  {/* We don't have per-row badge counts in the participants list, show placeholder */}
                  —
                </span>

                {/* Skills */}
                <span className="text-right text-xs font-bold" style={{ color:'var(--purple)' }}>—</span>

                {/* Synced */}
                <span className="text-right text-[9px]" style={{ color:'var(--text-muted)' }}>
                  {timeAgo(p.last_synced, t)}
                </span>
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-mono text-xs" style={{ color:'var(--text-muted)' }}>No participants found.</p>
            </div>
          )}
        </div>

        {/* Totals */}
        {participants.length > 0 && (
          <div className="mt-4 pt-3 flex flex-wrap gap-4" style={{ borderTop:'1px solid rgba(255,255,255,0.07)' }}>
            <Stat label="Participants" value={participants.length} color="var(--foreground)" />
            <Stat label="Avg Points" value={(participants.reduce((s,p) => s+(p.monthly_points??0),0)/participants.length).toFixed(1)} color="var(--gold)" />
            <Stat label="Top Score" value={(Math.max(...participants.map(p=>p.monthly_points??0))).toFixed(1)} color="var(--primary)" />
            {(() => {
              const legends = participants.filter(p=>(p.monthly_points??0)>=120).length;
              return legends > 0 ? <Stat label="Legends" value={legends} color="#fbbf24" /> : null;
            })()}
          </div>
        )}
      </div>

      {/* Setup hint when no real-time */}
      {!isLive && (
        <div className="px-4 py-3 rounded-xl font-mono text-[10px]" style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', color:'var(--gold)' }}>
          ⚡ Add <code style={{ background:'rgba(255,255,255,0.08)', padding:'1px 4px', borderRadius:3 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your .env.local to enable real-time leaderboard updates.
        </div>
      )}
    </div>
  );
}

function PodiumSlot({ rank, p, isMe }: { rank: 1|2|3; p: Participant; isMe: boolean }) {
  const pts    = p.monthly_points ?? 0;
  const tier   = getTier(pts);
  const HEIGHT = rank === 1 ? 80 : rank === 2 ? 64 : 52;
  const SCALE  = rank === 1 ? 1.1 : 1;
  const MEDAL  = ['🥇','🥈','🥉'][rank-1];
  const BORDER = rank === 1 ? 'rgba(251,191,36,0.4)' : rank === 2 ? 'rgba(148,163,184,0.4)' : 'rgba(184,115,51,0.4)';

  return (
    <div className="flex flex-col items-center gap-2" style={{ transform:`scale(${SCALE})`, transformOrigin:'bottom center' }}>
      <Avatar name={p.name} avatarUrl={p.avatar_url} size={40} color={tier?.color} />
      <div className="text-center">
        <p className="font-mono text-[10px] font-black uppercase tracking-wider truncate max-w-[80px]" style={{ color: isMe ? 'var(--primary)' : 'var(--foreground)' }}>{p.name.split(' ')[0]}</p>
        <p className="font-mono text-xs font-black" style={{ color: tier?.color ?? 'var(--gold)' }}>{pts.toFixed(1)}</p>
      </div>
      <div
        className="w-16 flex items-center justify-center rounded-t-lg font-mono text-lg font-black"
        style={{ height:HEIGHT, background:`${BORDER.replace('0.4','0.08')}`, border:`2px solid ${BORDER}`, borderBottom:'none', boxShadow:`inset 0 2px 0 ${BORDER}` }}>
        {MEDAL}
      </div>
    </div>
  );
}

function Avatar({ name, avatarUrl, size, color }: { name:string; avatarUrl?:string|null; size:number; color?:string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return (
    <div className="rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden"
      style={{ width:size, height:size, background:`${color ?? '#22d3ee'}20`, border:`2px solid ${color ?? '#22d3ee'}60`, fontSize:size*0.35, color: color ?? '#22d3ee', boxShadow:`0 0 8px ${color ?? '#22d3ee'}30` }}>
      {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}} /> : initials}
    </div>
  );
}

function Stat({ label, value, color }: { label:string; value:string|number; color:string }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
      <span className="font-mono text-sm font-black" style={{ color }}>{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-widest mt-0.5" style={{ color:'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
