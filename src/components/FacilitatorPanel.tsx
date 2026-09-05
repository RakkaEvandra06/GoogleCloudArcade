'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Participant, UploadBatch } from '@/lib/db';
import { useLang } from '@/lib/LanguageContext';
import SignOutDialog from '@/components/SignOutDialog';
import ThemeLangToggle from '@/components/ThemeLangToggle';
import { saveFacAuth, loadFacAuth, clearFacAuth, pruneExpiredAuth } from '@/lib/localAuth';
import {
  GridIcon, UsersIcon, UploadIcon, ClockIcon, MailIcon,
  RefreshIcon, LogOutIcon, CheckCircleIcon, XIcon,
  SearchIcon, FileIcon, AlertIcon, StatusDot,
  type IconProps,
} from '@/components/Icons';

type ArcadeIcon = (p: IconProps) => React.ReactElement | null;
type Tab = 'overview' | 'members' | 'import' | 'history' | 'email';

const TIERS = [{ name: 'Legend', min: 120 }, { name: 'Champion', min: 95 }, { name: 'Ranger', min: 75 }, { name: 'Trooper', min: 50 }];
function tier(pts: number) { return TIERS.find(t => pts >= t.min)?.name ?? 'Unranked'; }

const TAB_META: { id: Tab; Icon: ArcadeIcon; labelKey: string }[] = [
  { id: 'overview', Icon: GridIcon,    labelKey: 'fac.tab.overview' },
  { id: 'members',  Icon: UsersIcon,   labelKey: 'fac.tab.members'  },
  { id: 'import',   Icon: UploadIcon,  labelKey: 'fac.tab.import'   },
  { id: 'history',  Icon: ClockIcon,   labelKey: 'fac.tab.history'  },
  { id: 'email',    Icon: MailIcon,    labelKey: 'fac.tab.email'    },
];

export default function FacilitatorDashboard({ facName }: { facName: string }) {
  const router = useRouter();
  const [tab,           setTab]           = useState<Tab>('overview');
  const [members,       setMembers]       = useState<Participant[]>([]);
  const [batches,       setBatches]       = useState<UploadBatch[]>([]);
  const [search,        setSearch]        = useState('');
  const [locked,        setLocked]        = useState(false);
  const [syncId,        setSyncId]        = useState<string | null>(null);
  const [note,          setNote]          = useState<string | null>(null);
  const [csvPrev,       setCsvPrev]       = useState<{ url: string; valid: boolean; dup: boolean }[]>([]);
  const [csvFile,       setCsvFile]       = useState('');
  const [importing,     setImporting]     = useState(false);
  const [emailSubject,  setEmailSubject]  = useState('');
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [sending,       setSending]       = useState(false);
  const [showSignOut,   setShowSignOut]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useLang();

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const toast = (m: string) => { setNote(m); setTimeout(() => setNote(null), 3500); };

  useEffect(() => { if (!emailSubject) setEmailSubject(t('fac.email.default_subj')); }, [t]);
  const loadMembers = useCallback(async () => { const r = await fetch('/api/facilitator/members'); if (r.ok) { const d = await r.json(); setMembers(d.members ?? []); } }, []);
  const loadBatches = useCallback(async () => { const r = await fetch('/api/facilitator/batches'); if (r.ok) { const d = await r.json(); setBatches(d.batches ?? []); } }, []);
  useEffect(() => { pruneExpiredAuth(); const s = loadFacAuth(); if (s?.code) saveFacAuth(s.code, facName); loadMembers(); }, [loadMembers, facName]);
  useEffect(() => { if (tab === 'history') loadBatches(); }, [tab, loadBatches]);

  const syncMember = async (id: string) => {
    if (locked) { toast(t('toast.fac.locked')); return; }
    setSyncId(id);
    const r = await fetch(`/api/participants/${id}`, { method: 'POST' });
    setSyncId(null);
    r.ok ? (toast(t('toast.fac.synced')), loadMembers()) : toast(t('toast.fac.sync_fail'));
  };
  const syncAll = async () => {
    if (locked) { toast(t('toast.fac.locked')); return; }
    setLocked(true); toast(t('toast.fac.syncing_all'));
    for (const m of members) { await fetch(`/api/participants/${m.id}`, { method: 'POST' }); await new Promise<void>(r => setTimeout(r, 1000)); }
    setLocked(false); toast(t('toast.fac.all_synced').replace('{n}', String(members.length))); loadMembers();
  };
  const removeMember = async (id: string) => {
    await fetch(`/api/facilitator/members?id=${id}`, { method: 'DELETE' });
    setMembers(m => m.filter(x => x.id !== id)); toast(t('toast.fac.removed'));
  };
  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const txt = ev.target?.result as string;
      setCsvFile(f.name);
      const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
      const skip = lines[0]?.toLowerCase().includes('url') ? 1 : 0;
      const urls = lines.slice(skip).map(l => l.split(',').pop()?.trim() ?? l.trim()).filter(u => u.includes('/public_profiles/'));
      const existing = new Set(members.map(m => m.profile_url));
      setCsvPrev(urls.map(url => ({ url, valid: url.includes('/public_profiles/'), dup: existing.has(url) })));
    };
    r.readAsText(f);
  };
  const doImport = async () => {
    const rows = csvPrev.filter(r => r.valid && !r.dup).map(r => r.url);
    if (!rows.length) { toast(t('fac.import.no_valid')); return; }
    setImporting(true);
    const res = await fetch('/api/facilitator/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows, file_name: csvFile }) });
    setImporting(false);
    if (res.ok) { const d = await res.json(); toast(t('toast.fac.import_ok').replace('{ok}', String(d.successful)).replace('{total}', String(rows.length))); setCsvPrev([]); setCsvFile(''); loadMembers(); }
    else toast(t('toast.fac.import_fail'));
  };
  const rollback = async (id: string) => {
    const r = await fetch(`/api/facilitator/batches?id=${id}`, { method: 'DELETE' });
    r.ok ? (toast(t('toast.fac.rollback_ok')), loadBatches(), loadMembers()) : toast(t('toast.fac.rollback_fail'));
  };
  const sendEmails = async () => {
    if (!selected.size) { toast(t('toast.fac.select_first')); return; }
    setSending(true);
    const r = await fetch('/api/facilitator/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_ids: [...selected], subject: emailSubject }) });
    setSending(false);
    if (r.ok) { const d = await r.json(); toast(t('toast.fac.email_sent').replace('{n}', String(d.sent))); setSelected(new Set()); }
    else { const d = await r.json().catch(() => ({ error: '' })); toast(d.error || t('toast.fac.email_fail')); }
  };
  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/facilitator-login'); };

  const filtered = members.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.profile_url.includes(search));

  const navBg = isDark ? 'rgba(13,19,25,0.95)' : 'rgba(249,250,252,0.96)';
  const navBd = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';

  return (
    <div className="min-h-dvh" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Navbar ── */}
      <div className="w-full sticky top-0 z-50"
        style={{ background: navBg, backdropFilter: 'saturate(180%) blur(18px)', borderBottom: `1px solid ${navBd}`, boxShadow: isDark ? '0 1px 0 rgba(255,255,255,0.03)' : '0 1px 0 rgba(0,0,0,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
              style={{ border: '1px solid rgba(52,168,83,0.45)', background: 'rgba(52,168,83,0.10)' }}>
              <img src="/500px.png" alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{t('fac.panel_title')}</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(52,168,83,0.12)', color: 'var(--green)', border: '1px solid rgba(52,168,83,0.28)' }}>
                {facName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {locked && (
              <span className="flex items-center gap-1 tag tag-red text-[9px]">
                <AlertIcon size={10} aria-hidden="true" />
                {t('fac.locked')}
              </span>
            )}
            <ThemeLangToggle />
            <button onClick={() => setShowSignOut(true)}
              className="flex items-center gap-1.5 btn-ghost text-[9px] px-3 py-1.5">
              <LogOutIcon size={11} aria-hidden="true" />
              {t('profile.sign_out')}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto no-scrollbar"
          style={{ borderTop: `1px solid ${navBd}` }} role="tablist">
          {TAB_META.map(({ id, Icon, labelKey }) => (
            <button key={id} role="tab" aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors"
              style={{
                color: tab === id ? 'var(--green)' : 'var(--text-muted)',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === id ? 'var(--green)' : 'transparent'}`,
              }}>
              <Icon size={12} aria-hidden="true" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <SignOutDialog isOpen={showSignOut} userName={facName} onCancel={() => setShowSignOut(false)} onConfirm={async () => { setShowSignOut(false); await signOut(); }} />

      {/* Toast */}
      {note && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl font-mono text-xs font-bold animate-toast-in"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', color: 'var(--foreground)' }}>
          {note}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-4 animate-fade-slide-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                [t('fac.stat.total'),  members.length,                                                                                                          'var(--blue)'],
                [t('fac.stat.avg'),    members.length ? (members.reduce((s, m) => s + (m.monthly_points ?? 0), 0) / members.length).toFixed(1) : '0',          'var(--yellow)'],
                [t('fac.stat.today'),  members.filter(m => m.last_synced && new Date(m.last_synced).toDateString() === new Date().toDateString()).length,        'var(--green)'],
                [t('fac.stat.50pts'),  members.filter(m => (m.monthly_points ?? 0) >= 50).length,                                                              'var(--purple)'],
              ].map(([l, v, c]) => (
                <div key={l as string} className="glass-card text-center py-4">
                  <p className="font-black text-3xl font-mono" style={{ color: c as string }}>{v as any}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>{l as string}</p>
                </div>
              ))}
            </div>

            {/* Tier distribution */}
            <div className="glass-card">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{t('fac.tier_dist')}</p>
              {TIERS.map(tt => {
                const c = members.filter(m => (m.monthly_points ?? 0) >= tt.min).length;
                const pct = members.length ? Math.round((c / members.length) * 100) : 0;
                return (
                  <div key={tt.name} className="mb-2.5">
                    <div className="flex justify-between font-mono text-[10px] mb-1">
                      <span style={{ color: 'var(--foreground)' }}>{tt.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{c} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-alt)' }}>
                      <div className="h-full rounded-full animate-progress" style={{ width: `${pct}%`, background: 'var(--blue)' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Milestone progress */}
            <div className="glass-card">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{t('fac.ms_progress_full')}</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  [t('fac.ms.m1'),       t('fac.ms.m1_threshold'),  15,  'var(--green)'],
                  [t('fac.ms.m2'),       t('fac.ms.m2_threshold'),  25,  'var(--blue)'],
                  [t('fac.ms.ultimate'), t('fac.ms.ult_threshold'), 50,  'var(--yellow)'],
                ].map(([l, d, min, c]) => {
                  const cnt = members.filter(m => (m.monthly_points ?? 0) >= (min as number)).length;
                  return (
                    <div key={l as string} className="text-center p-3 rounded-xl"
                      style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-md)' }}>
                      <p className="font-black text-2xl font-mono" style={{ color: c as string }}>{cnt}</p>
                      <p className="font-mono text-[9px] font-bold uppercase mt-0.5" style={{ color: 'var(--foreground)' }}>{l}</p>
                      <p className="font-mono text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{d}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Members ── */}
        {tab === 'members' && (
          <div className="space-y-3 animate-fade-slide-up">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-dim)' }} aria-hidden="true" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t('fac.members.search')} className="glass-input py-2 text-xs pl-8 w-full" />
              </div>
              <button onClick={syncAll} disabled={locked}
                className="btn-cyan text-[9px] px-4 py-2 whitespace-nowrap flex items-center gap-1.5">
                <RefreshIcon size={11} className={locked ? 'animate-spin' : ''} aria-hidden="true" />
                {locked ? t('fac.members.syncing') : t('fac.members.sync_all_n').replace('{n}', String(members.length))}
              </button>
            </div>

            <div className="glass-card" style={{ padding: '0.75rem' }}>
              {/* Table header */}
              <div className="grid font-mono text-[9px] font-bold uppercase tracking-widest px-3 py-2 mb-1 rounded-lg"
                style={{ gridTemplateColumns: '1fr 5rem 5rem 5.5rem 7rem', background: 'var(--surface-alt)', color: 'var(--text-muted)' }}>
                <span>{t('fac.members.col.name')}</span>
                <span className="text-right">{t('fac.members.col.pts')}</span>
                <span className="text-right">{t('fac.members.col.tier')}</span>
                <span className="text-right">{t('fac.members.col.synced')}</span>
                <span className="text-right">{t('fac.members.col.action')}</span>
              </div>
              <div className="space-y-1 max-h-[480px] overflow-y-auto no-scrollbar">
                {filtered.map(m => (
                  <div key={m.id} className="grid items-center px-3 py-2.5 rounded-xl"
                    style={{ gridTemplateColumns: '1fr 5rem 5rem 5.5rem 7rem', background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                    <div className="min-w-0">
                      <p className="font-medium text-xs truncate" style={{ color: 'var(--foreground)' }}>{m.name || '—'}</p>
                      <p className="font-mono text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{m.profile_url}</p>
                    </div>
                    <span className="text-right font-mono text-xs font-bold" style={{ color: 'var(--yellow)' }}>{(m.monthly_points ?? 0).toFixed(1)}</span>
                    <span className="text-right font-mono text-[9px]" style={{ color: 'var(--blue)' }}>{tier(m.monthly_points ?? 0)}</span>
                    <span className="text-right font-mono text-[9px]" style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>
                      {m.last_synced ? new Date(m.last_synced).toLocaleDateString() : t('fac.members.never')}
                    </span>
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => syncMember(m.id)} disabled={syncId === m.id || locked}
                        className="btn-cyan text-[8px] px-2 py-1 flex items-center gap-1" aria-label={`Sync ${m.name}`}>
                        <RefreshIcon size={10} className={syncId === m.id ? 'animate-spin' : ''} aria-hidden="true" />
                      </button>
                      <button onClick={() => removeMember(m.id)}
                        className="flex items-center justify-center w-6 h-6 rounded font-mono font-bold"
                        style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-border)' }}
                        aria-label={`Remove ${m.name}`}>
                        <XIcon size={9} />
                      </button>
                    </div>
                  </div>
                ))}
                {!filtered.length && (
                  <div className="py-10 text-center">
                    <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{t('fac.members.empty')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Import ── */}
        {tab === 'import' && (
          <div className="space-y-4 animate-fade-slide-up">
            <div className="glass-card space-y-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: 'var(--blue)' }}>
                <UploadIcon size={12} aria-hidden="true" />
                {t('fac.import.title')}
              </p>
              <div className="p-3 rounded-lg font-mono text-[9px]"
                style={{ background: 'var(--surface-alt)', border: '1px dashed var(--border-md)', color: 'var(--text-muted)' }}>
                <p className="font-bold mb-1">{t('fac.import.csv_format')}</p>
                <p>{t('fac.import.csv_label')}</p>
                <p>https://www.skills.google/public_profiles/xxx</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCsv} className="hidden" />
              <button onClick={() => fileRef.current?.click()}
                className="btn-cyan w-full text-xs py-3 flex items-center justify-center gap-2">
                <FileIcon size={13} aria-hidden="true" />
                {csvFile ? csvFile : t('fac.import.choose_file')}
              </button>
            </div>

            {csvPrev.length > 0 && (
              <div className="glass-card space-y-3">
                <div className="flex justify-between items-center">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {t('fac.import.preview_n').replace('{n}', String(csvPrev.length))}
                  </p>
                  <div className="flex gap-3 font-mono text-[9px]">
                    <span className="flex items-center gap-1" style={{ color: 'var(--green)' }}>
                      <StatusDot color="var(--green)" size={6} />
                      {t('fac.import.new_count').replace('{n}', String(csvPrev.filter(r => r.valid && !r.dup).length))}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--yellow)' }}>
                      <StatusDot color="var(--yellow)" size={6} />
                      {t('fac.import.dup_count').replace('{n}', String(csvPrev.filter(r => r.dup).length))}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--red)' }}>
                      <StatusDot color="var(--red)" size={6} />
                      {t('fac.import.invalid_count').replace('{n}', String(csvPrev.filter(r => !r.valid).length))}
                    </span>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1">
                  {csvPrev.slice(0, 40).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                      <StatusDot
                        color={r.dup ? 'var(--yellow)' : r.valid ? 'var(--green)' : 'var(--red)'}
                        size={7}
                      />
                      <span className="font-mono text-[9px] truncate"
                        style={{ color: r.dup ? 'var(--yellow)' : r.valid ? 'var(--green)' : 'var(--red)' }}>
                        {r.url}
                      </span>
                      {r.dup && <span className="tag tag-gold text-[7px] shrink-0">{t('fac.import.dup_tag')}</span>}
                    </div>
                  ))}
                </div>
                <button
                  onClick={doImport}
                  disabled={importing || csvPrev.filter(r => r.valid && !r.dup).length === 0}
                  className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2">
                  {importing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                      {t('fac.import.importing')}
                    </>
                  ) : (
                    <>
                      <UploadIcon size={13} aria-hidden="true" />
                      {t('fac.import.btn_n').replace('{n}', String(csvPrev.filter(r => r.valid && !r.dup).length))}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── History ── */}
        {tab === 'history' && (
          <div className="glass-card animate-fade-slide-up space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
              style={{ color: 'var(--text-muted)' }}>
              <ClockIcon size={12} aria-hidden="true" />
              {t('fac.history.title')}
            </p>
            {batches.length === 0 && (
              <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>{t('fac.history.empty')}</p>
            )}
            {batches.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', opacity: b.rolled_back ? 0.5 : 1 }}>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold truncate flex items-center gap-1.5"
                    style={{ color: 'var(--foreground)' }}>
                    <FileIcon size={11} aria-hidden="true" />
                    {b.file_name}
                  </p>
                  <p className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>
                    {new Date(b.created_at).toLocaleString()} · {b.total} {t('fac.history.total')} ·{' '}
                    <span style={{ color: 'var(--green)' }}>{b.successful} {t('fac.history.ok')}</span> ·{' '}
                    <span style={{ color: 'var(--red)' }}>{b.failed} {t('fac.history.failed')}</span>
                  </p>
                </div>
                {b.rolled_back
                  ? <span className="tag tag-gray text-[8px]">{t('fac.history.rolled')}</span>
                  : (
                    <button onClick={() => rollback(b.id)}
                      className="text-[8px] px-3 py-1.5 rounded-lg font-mono font-bold whitespace-nowrap flex items-center gap-1"
                      style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
                      <XIcon size={9} aria-hidden="true" />
                      {t('fac.history.rollback')}
                    </button>
                  )
                }
              </div>
            ))}
          </div>
        )}

        {/* ── Email ── */}
        {tab === 'email' && (
          <div className="space-y-3 animate-fade-slide-up">
            <div className="glass-card space-y-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: 'var(--blue)' }}>
                <MailIcon size={12} aria-hidden="true" />
                {t('fac.email.title')}
              </p>
              <div>
                <label className="font-mono text-[9px] font-bold uppercase tracking-widest block mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>{t('fac.email.subject')}</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="glass-input py-2 text-xs" />
              </div>
              <div className="flex justify-between items-center">
                <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('fac.email.select_lbl')}</p>
                <button
                  onClick={() => setSelected(s => s.size === members.length ? new Set() : new Set(members.map(m => m.id)))}
                  className="btn-ghost text-[9px] px-2 py-1">
                  {selected.size === members.length ? t('fac.email.deselect_all_btn') : t('fac.email.select_all_btn')}
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">
                {members.map(m => (
                  <label key={m.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
                    style={{
                      background: selected.has(m.id) ? 'var(--blue-dim)' : 'var(--surface-alt)',
                      border: `1px solid ${selected.has(m.id) ? 'var(--blue-border)' : 'var(--border)'}`,
                    }}>
                    <input type="checkbox" checked={selected.has(m.id)}
                      onChange={e => { setSelected(s => { const n = new Set(s); e.target.checked ? n.add(m.id) : n.delete(m.id); return n; }); }}
                      className="accent-blue-500" />
                    <span className="font-mono text-xs truncate" style={{ color: 'var(--foreground)' }}>
                      {m.name || m.profile_url}
                    </span>
                    <span className="font-mono text-[9px] ml-auto" style={{ color: 'var(--yellow)' }}>
                      {(m.monthly_points ?? 0).toFixed(1)} pts
                    </span>
                  </label>
                ))}
              </div>
              <p className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('fac.email.resend_note')}</p>
              <button onClick={sendEmails} disabled={sending || selected.size === 0}
                className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2">
                {sending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    {t('fac.email.sending')}
                  </>
                ) : (
                  <>
                    <MailIcon size={13} aria-hidden="true" />
                    {t('fac.email.send_n').replace('{n}', String(selected.size))}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
