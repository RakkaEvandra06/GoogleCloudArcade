'use client';
import { useLang } from '@/lib/LanguageContext';
import SignOutDialog from '@/components/SignOutDialog';
import { saveAdminAuth } from '@/lib/localAuth';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Participant, AuditLog, FeedbackItem } from '@/lib/db';
import { UpdateIcon, ExitIcon } from '@radix-ui/react-icons';
type Tab='overview'|'unsynced'|'recent'|'facilitators'|'feedback'|'audit'|'maintenance'|'mastersync';
export default function AdminPanel() {
  const { t } = useLang();
  const [showSignOut, setShowSignOut] = useState(false);
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>('overview');
  const [stats, setStats]       = useState<any>(null);
  const [facs, setFacs]         = useState<any[]>([]);
  const [unsynced, setUnsynced] = useState<Participant[]>([]);
  const [recent, setRecent]     = useState<Participant[]>([]);
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [feedback, setFB]       = useState<FeedbackItem[]>([]);
  const [maint, setMaint]       = useState(false);
  const [syncProg, setSyncProg] = useState<any>(null);
  const [isSyncing, setSyncing] = useState(false);
  const [note, setNote]         = useState<string|null>(null);
  const [fbSearch, setFbSearch] = useState('');
  const [auSearch, setAuSearch] = useState('');
  const [newName, setNewName]   = useState('');
  const [newCode, setNewCode]   = useState('');
  const toast = (m:string) => { setNote(m); setTimeout(()=>setNote(null),3500); };

  const loadStats = useCallback(async()=>{ const r=await fetch('/api/admin/stats'); if(r.ok){const d=await r.json(); setStats(d.stats); setFacs(d.facilitators??[]);} },[]);
  const loadParticipants = useCallback(async()=>{
    const r=await fetch('/api/participants'); if(!r.ok)return;
    const d=await r.json(); const all=d.participants??[];
    const cutoff=Date.now()-24*3600*1000;
    setUnsynced(all.filter((p:Participant)=>!p.last_synced||new Date(p.last_synced).getTime()<cutoff));
    setRecent(all.filter((p:Participant)=>p.created_at&&new Date(p.created_at).getTime()>cutoff));
  },[]);
  const loadMaint=useCallback(async()=>{const r=await fetch('/api/admin/maintenance');if(r.ok){const d=await r.json();setMaint(d.maintenance??false);}},[]);
  const loadLogs=useCallback(async()=>{const r=await fetch('/api/admin/audit-logs?limit=100');if(r.ok){const d=await r.json();setLogs(d.logs??[]);}},[]);
  const loadFB=useCallback(async()=>{const r=await fetch('/api/feedback');if(r.ok){const d=await r.json();setFB(d.feedback??[]);}},[]);

  useEffect(()=>{ loadStats(); },[loadStats]);
  useEffect(()=>{ if(tab==='unsynced'||tab==='recent') loadParticipants(); if(tab==='audit') loadLogs(); if(tab==='feedback') loadFB(); if(tab==='maintenance') loadMaint(); },[tab,loadParticipants,loadLogs,loadFB,loadMaint]);

  const toggleMaint=async()=>{const r=await fetch('/api/admin/maintenance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!maint})});if(r.ok){setMaint(m=>!m);toast(`Maintenance ${!maint?'ON':'OFF'}.`);}};
  const syncOne=async(id:string)=>{const r=await fetch(`/api/participants/${id}`,{method:'POST'});r.ok?toast('✓ Synced!'):toast('✕ Failed.');loadParticipants();};
  const masterSync=async()=>{setSyncing(true);setSyncProg(null);const r=await fetch('/api/admin/master-sync',{method:'POST',headers:{'Content-Type':'application/json'}});if(r.ok){const d=await r.json();setSyncProg(d);toast(`✓ ${d.success}/${d.total} synced.`);}else{const d=await r.json().catch(()=>({error:''}));toast(d.error||'✕ Failed.');}setSyncing(false);};
  const createFac=async()=>{if(!newName||!newCode){toast('Name and code required.');return;}const r=await fetch('/api/admin/facilitators',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newName,code:newCode})});if(r.ok){toast(`✓ Created: ${newCode}`);setNewName('');setNewCode('');loadStats();}else{const d=await r.json().catch(()=>({error:''}));toast(d.error||'✕ Failed.');}};
  const signOut=async()=>{await fetch('/api/auth/logout',{method:'POST'});router.push('/admin-login');};

  const TABS:Tab[]=['overview','unsynced','recent','facilitators','feedback','audit','maintenance','mastersync'];
  const LABELS=['🗠 Overview','⚠︎ Unsynced','ⓘ Recent','🗣 Facilitators','🗨 Feedback','🗎 Audit','🛠 Maintenance.','⟳ Master Sync'];
  const filtFB=feedback.filter(f=>!fbSearch||f.message.toLowerCase().includes(fbSearch.toLowerCase()));
  const filtAu=logs.filter(a=>!auSearch||a.action.includes(auSearch)||(a.actor??'').includes(auSearch));

  return(
    <div className="min-h-dvh" style={{position:'relative',zIndex:1}}>
      <div className="w-full" style={{background:'rgba(13,19,25,0.92)',backdropFilter:'blur(16px)',borderBottom:'1px solid var(--border-md)'}}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3"><img src="/500px.png" alt="" className="w-8 h-8 rounded-lg object-cover" style={{border:'1px solid rgba(234,67,53,0.5)'}}/><div><span className="font-bold text-sm" style={{color:'var(--foreground)'}}>Admin Panel</span><span className="font-mono text-xs ml-2" style={{color:'var(--red)'}}>Mentor Utama</span></div></div>
          <div className="flex items-center gap-2">{maint&&<span className="tag tag-red text-[9px]">🛠 MAINTENANCE</span>}<button onClick={()=>setShowSignOut(true)} className="btn-ghost text-[9px] px-3 py-1.5"><ExitIcon className="w-3 h-3"/>Exit</button></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-0 overflow-x-auto no-scrollbar">
          {TABS.map((id,i)=><button key={id} onClick={()=>setTab(id)} className="px-3 py-2.5 text-[10px] font-semibold whitespace-nowrap" style={{color:tab===id?'var(--red)':'var(--text-muted)',background:'transparent',border:'none',borderBottom:`2px solid ${tab===id?'var(--red)':'transparent'}`}}>{LABELS[i]}</button>)}
        </div>
      </div>
      {note&&<div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl font-mono text-xs font-bold animate-toast-in" style={{background:'var(--surface)',border:'1px solid var(--border-md)',boxShadow:'0 8px 24px rgba(0,0,0,0.4)',color:'var(--foreground)'}}>{note}</div>}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {tab==='overview'&&stats&&<div className="space-y-4 animate-fade-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['Total',stats.total,'var(--blue)'],['Synced 24h',stats.synced24h,'var(--green)'],['Unsynced',stats.unsynced,'var(--red)'],['Total Pts',stats.totalPoints?.toFixed(1),'var(--yellow)']].map(([l,v,c])=>(
              <div key={l as string} className="glass-card text-center py-4"><p className="font-black text-3xl font-mono" style={{color:c as string}}>{v??'—'}</p><p className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{color:'var(--text-muted)'}}>{l}</p></div>
            ))}
          </div>
          <div className="glass-card"><p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-3" style={{color:'var(--text-muted)'}}>Quick Actions</p><div className="flex flex-wrap gap-2"><button onClick={()=>setTab('mastersync')} className="btn-primary text-xs py-2 px-4">⟳ Master Sync</button><button onClick={()=>setTab('maintenance')} className="btn-ghost text-xs py-2 px-4">🛠 Maintenance</button><button onClick={()=>setTab('audit')} className="btn-ghost text-xs py-2 px-4">🗎 Audit Logs</button></div></div>
        </div>}
        {(tab==='unsynced'||tab==='recent')&&<div className="glass-card animate-fade-slide-up space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:tab==='unsynced'?'var(--red)':'var(--blue)'}}>{tab==='unsynced'?`⚠︎ Unsynced (${unsynced.length})`:`ⓘ Recent 24h (${recent.length})`}</p>
            {tab==='unsynced'&&<button onClick={async()=>{for(const p of unsynced){await syncOne(p.id);await new Promise(r=>setTimeout(r,1200));}}} className="btn-cyan text-[9px] px-3 py-1.5">Sync All</button>}
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto no-scrollbar">
            {(tab==='unsynced'?unsynced:recent).map(p=>(
              <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl" style={{background:'var(--surface-alt)',border:'1px solid var(--border)'}}>
                <div className="min-w-0"><p className="font-mono text-xs font-bold truncate" style={{color:'var(--foreground)'}}>{p.name||'—'}</p><p className="font-mono text-[9px]" style={{color:'var(--text-muted)'}}>{tab==='unsynced'?(p.last_synced?`Last: ${new Date(p.last_synced).toLocaleString()}`:'Never synced'):new Date(p.created_at).toLocaleString()}</p></div>
                {tab==='unsynced'&&<button onClick={()=>syncOne(p.id)} className="btn-cyan text-[8px] px-2 py-1"><UpdateIcon className="w-2.5 h-2.5"/></button>}
              </div>
            ))}
            {(tab==='unsynced'?unsynced:recent).length===0&&<p className="text-center py-8 text-xs font-mono" style={{color:'var(--green)'}}>✓ {tab==='unsynced'?'All synced!':'No new participants.'}</p>}
          </div>
        </div>}
        {tab==='facilitators'&&<div className="space-y-3 animate-fade-slide-up">
          <div className="glass-card space-y-3"><p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:'var(--text-muted)'}}>Create Code</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Facilitator name" className="glass-input py-2 text-xs"/><input value={newCode} onChange={e=>setNewCode(e.target.value.toUpperCase())} placeholder="FAC-XYZ-123" className="glass-input py-2 text-xs font-mono"/></div>
            <button onClick={createFac} className="btn-primary text-xs py-2.5 w-full">+ Create Code</button>
          </div>
          <div className="glass-card space-y-2"><p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:'var(--text-muted)'}}>All Facilitators ({facs.length})</p>
            {facs.map(f=><div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl" style={{background:'var(--surface-alt)',border:'1px solid var(--border)'}}><div><p className="font-mono text-xs font-bold" style={{color:'var(--foreground)'}}>{f.name}</p><p className="font-mono text-[9px]" style={{color:'var(--blue)'}}>{f.code}</p></div><div className="flex items-center gap-3"><span className="font-mono text-xs font-bold" style={{color:'var(--yellow)'}}>{f.memberCount} members</span><span className={`tag text-[8px] ${f.is_active?'tag-green':'tag-red'}`}>{f.is_active?'Active':'Inactive'}</span></div></div>)}
            {!facs.length&&<p className="text-center py-6 text-xs font-mono" style={{color:'var(--text-muted)'}}>No facilitator codes yet.</p>}
          </div>
        </div>}
        {tab==='feedback'&&<div className="glass-card animate-fade-slide-up space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-muted)'}}>🗨 Feedback ({feedback.length})</p><input value={fbSearch} onChange={e=>setFbSearch(e.target.value)} placeholder="Search…" className="glass-input py-2 text-xs w-48"/></div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
            {filtFB.map(f=><div key={f.id} className="px-3 py-2.5 rounded-xl" style={{background:'var(--surface-alt)',border:'1px solid var(--border)'}}><div className="flex items-center justify-between gap-2 mb-1"><span className="tag tag-gray text-[8px]">{f.category}</span><span className="font-mono text-[9px]" style={{color:'var(--text-muted)'}}>{new Date(f.created_at).toLocaleDateString()}</span>{f.rating&&<span className="text-xs">{'★'.repeat(f.rating)}</span>}</div><p className="text-xs leading-relaxed" style={{color:'var(--foreground)'}}>{f.message}</p></div>)}
            {!filtFB.length&&<p className="text-center py-8 text-xs font-mono" style={{color:'var(--text-muted)'}}>No feedback yet.</p>}
          </div>
        </div>}
        {tab==='audit'&&<div className="glass-card animate-fade-slide-up space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between"><p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-muted)'}}>🗎 Audit ({logs.length})</p><input value={auSearch} onChange={e=>setAuSearch(e.target.value)} placeholder="Filter…" className="glass-input py-2 text-xs w-56"/></div>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto no-scrollbar">
            {filtAu.map(l=><div key={l.id} className="flex items-start gap-3 px-3 py-2 rounded-xl" style={{background:'var(--surface-alt)',border:'1px solid var(--border)'}}><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="tag tag-blue text-[8px]">{l.action}</span><span className="font-mono text-[9px] font-bold" style={{color:'var(--purple)'}}>{l.actor}</span></div>{l.meta&&<p className="font-mono text-[8px] mt-0.5 truncate" style={{color:'var(--text-muted)'}}>{JSON.stringify(l.meta)}</p>}</div><span className="font-mono text-[9px] shrink-0" style={{color:'var(--text-muted)'}}>{new Date(l.created_at).toLocaleString()}</span></div>)}
            {!filtAu.length&&<p className="text-center py-8 text-xs font-mono" style={{color:'var(--text-muted)'}}>No audit logs.</p>}
          </div>
        </div>}
        {tab==='maintenance'&&<div className="glass-card animate-fade-slide-up space-y-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-muted)'}}>🛠 Maintenance Mode</p>
          <div className="flex items-center justify-between p-4 rounded-xl" style={{background:maint?'var(--red-dim)':'var(--green-dim)',border:`1px solid ${maint?'var(--red-border)':'var(--green-border)'}`}}>
            <div><p className="font-bold text-sm" style={{color:maint?'var(--red)':'var(--green)'}}>{maint?'🛠 Maintenance ON':'✔ System Operational'}</p><p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{maint?'All sync operations are blocked.':'All syncs running normally.'}</p></div>
            <button onClick={toggleMaint} className="px-4 py-2 rounded-lg text-xs font-bold font-mono" style={{background:maint?'var(--green)':'var(--red)',color:'#fff',border:'none'}}>{maint?'Disable':'Enable'}</button>
          </div>
        </div>}
        {tab==='mastersync'&&<div className="glass-card animate-fade-slide-up space-y-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-muted)'}}>⟳ Master Sync</p>
          {maint&&<div className="p-3 rounded-xl text-xs font-mono" style={{background:'var(--red-dim)',border:'1px solid var(--red-border)',color:'var(--red)'}}>⚠︎ Disable maintenance mode first.</div>}
          <div className="p-4 rounded-xl" style={{background:'var(--blue-dim)',border:'1px solid var(--blue-border)'}}><p className="font-bold text-sm mb-1" style={{color:'var(--blue)'}}>What this does:</p><ul className="text-xs space-y-1" style={{color:'var(--text-muted)'}}><li>• Re-scrapes every participant's Skills Boost profile</li><li>• Updates badge counts and Arcade points</li><li>• 1-second delay between participants</li><li>• Logged to Audit Logs</li></ul></div>
          {syncProg&&<div className="space-y-2"><div className="h-3 rounded-full overflow-hidden" style={{background:'var(--surface-alt)'}}><div className="h-full rounded-full" style={{width:`${(syncProg.success/syncProg.total)*100}%`,background:'var(--green)'}}/></div><div className="flex justify-between font-mono text-[10px]"><span style={{color:'var(--green)'}}>✓ {syncProg.success}</span><span style={{color:'var(--red)'}}>✕ {syncProg.failed}</span><span style={{color:'var(--text-muted)'}}>Total: {syncProg.total}</span></div>{syncProg.finishedAt&&<p className="font-mono text-[9px] text-center" style={{color:'var(--text-muted)'}}>Done: {new Date(syncProg.finishedAt).toLocaleString()}</p>}</div>}
          <button onClick={masterSync} disabled={isSyncing||maint} className="btn-primary w-full text-xs py-3">
            {isSyncing?<span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}}/>Syncing all…</span>:'⟳ Start Master Sync'}
          </button>
        </div>}
      </main>
    </div>
  );
}
