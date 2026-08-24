'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Participant, UploadBatch } from '@/lib/db';
import { UpdateIcon, ExitIcon } from '@radix-ui/react-icons';
import { useLang } from '@/lib/LanguageContext';
import SignOutDialog from '@/components/SignOutDialog';
import { saveFacAuth, clearFacAuth, pruneExpiredAuth } from '@/lib/localAuth';
type Tab='overview'|'members'|'import'|'history'|'email';
const TIERS=[{name:'Legend',min:120},{name:'Champion',min:95},{name:'Ranger',min:75},{name:'Trooper',min:50}];
function tier(pts:number){return TIERS.find(t=>pts>=t.min)?.name??'Unranked';}
export default function FacilitatorDashboard({facName}:{facName:string}){
  const router=useRouter();
  const [tab,setTab]=useState<Tab>('overview');
  const [members,setMembers]=useState<Participant[]>([]);
  const [batches,setBatches]=useState<UploadBatch[]>([]);
  const [search,setSearch]=useState('');
  const [locked,setLocked]=useState(false);
  const [syncId,setSyncId]=useState<string|null>(null);
  const [note,setNote]=useState<string|null>(null);
  const [csvPrev,setCsvPrev]=useState<{url:string;valid:boolean;dup:boolean}[]>([]);
  const [csvFile,setCsvFile]=useState('');
  const [importing,setImporting]=useState(false);
  const [emailSubject,setEmailSubject]=useState('Your Arcade 2026 Progress Report');
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [sending,setSending]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const { t } = useLang();
  const [showSignOut, setShowSignOut] = useState(false);
  const toast=(m:string)=>{setNote(m);setTimeout(()=>setNote(null),3500);};
  const loadMembers=useCallback(async()=>{const r=await fetch('/api/facilitator/members');if(r.ok){const d=await r.json();setMembers(d.members??[]);};},[]);
  const loadBatches=useCallback(async()=>{const r=await fetch('/api/facilitator/batches');if(r.ok){const d=await r.json();setBatches(d.batches??[]);};},[]);
  useEffect(()=>{ pruneExpiredAuth(); saveFacAuth('', facName); loadMembers(); },[loadMembers, facName]);
  useEffect(()=>{if(tab==='history')loadBatches();},[tab,loadBatches]);
  const syncMember=async(id:string)=>{if(locked){toast('⚠︎ System locked.');return;}setSyncId(id);const r=await fetch(`/api/participants/${id}`,{method:'POST'});setSyncId(null);r.ok?(toast('✓ Synced!'),loadMembers()):toast('✕ Sync failed.');};
  const syncAll=async()=>{if(locked){toast('⚠︎ System locked.');return;}setLocked(true);toast('⟳ Syncing all…');for(const m of members){await fetch(`/api/participants/${m.id}`,{method:'POST'});await new Promise<void>(r=>setTimeout(r,1000));}setLocked(false);toast(`✓ All ${members.length} synced!`);loadMembers();};
  const removeMember=async(id:string)=>{await fetch(`/api/facilitator/members?id=${id}`,{method:'DELETE'});setMembers(m=>m.filter(x=>x.id!==id));toast('Member removed.');};
  const handleCsv=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const txt=ev.target?.result as string;setCsvFile(f.name);const lines=txt.split('\n').map(l=>l.trim()).filter(Boolean);const skip=lines[0]?.toLowerCase().includes('url')?1:0;const urls=lines.slice(skip).map(l=>l.split(',').pop()?.trim()??l.trim()).filter(u=>u.includes('/public_profiles/'));const existing=new Set(members.map(m=>m.profile_url));setCsvPrev(urls.map(url=>({url,valid:url.includes('/public_profiles/'),dup:existing.has(url)})));};r.readAsText(f);};
  const doImport=async()=>{const rows=csvPrev.filter(r=>r.valid&&!r.dup).map(r=>r.url);if(!rows.length){toast(t('fac.import.no_valid'));return;}setImporting(true);const res=await fetch('/api/facilitator/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows,file_name:csvFile})});setImporting(false);if(res.ok){const d=await res.json();toast(`✓ Imported ${d.successful}/${rows.length}`);setCsvPrev([]);setCsvFile('');loadMembers();}else toast('✕ Import failed.');};
  const rollback=async(id:string)=>{const r=await fetch(`/api/facilitator/batches?id=${id}`,{method:'DELETE'});r.ok?(toast('✓ Rolled back.'),loadBatches(),loadMembers()):toast('✕ Rollback failed.');};
  const sendEmails=async()=>{if(!selected.size){toast('Select members first.');return;}setSending(true);const r=await fetch('/api/facilitator/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({member_ids:[...selected],subject:emailSubject})});setSending(false);if(r.ok){const d=await r.json();toast(`✓ Sent ${d.sent} emails.`);setSelected(new Set());}else{const d=await r.json().catch(()=>({error:''}));toast(d.error||'✕ Email failed.');}};
  const signOut=async()=>{ /* Keep fac code in localStorage for quick re-login */ await fetch('/api/auth/logout',{method:'POST'}); router.push('/facilitator-login'); };
  const filtered=members.filter(m=>!search||m.name.toLowerCase().includes(search.toLowerCase())||m.profile_url.includes(search));
  const TABS:[[Tab,string]][]=[['overview',t('fac.tab.overview')],['members',t('fac.tab.members')],['import',t('fac.tab.import')],['history',t('fac.tab.history')],['email',t('fac.tab.email')]] as any;
  return(
    <div className="min-h-dvh" style={{position:'relative',zIndex:1}}>
      <div className="w-full" style={{background:'rgba(13,19,25,0.92)',backdropFilter:'blur(16px)',borderBottom:'1px solid var(--border-md)'}}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><img src="/500px.png" alt="" className="w-8 h-8 rounded-lg object-cover" style={{border:'1px solid rgba(52,168,83,0.45)'}}/><div><span className="font-bold text-sm" style={{color:'var(--foreground)'}}>{t('fac.panel_title')}</span><span className="font-mono text-xs ml-2" style={{color:'var(--green)'}}>{facName}</span></div></div>
          <div className="flex items-center gap-2">{locked&&<span className="tag tag-red text-[9px]">{t('fac.locked')}</span>}<button onClick={()=>setShowSignOut(true)} className="btn-ghost text-[9px] px-3 py-1.5"><ExitIcon className="w-3 h-3"/>{t('profile.sign_out')}</button></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-0 overflow-x-auto no-scrollbar">
          {(['overview','members','import','history','email'] as Tab[]).map((id,i)=>{const labels=[t('fac.tab.overview'),t('fac.tab.members'),t('fac.tab.import'),t('fac.tab.history'),t('fac.tab.email')];return(<button key={id} onClick={()=>setTab(id)} className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap" style={{color:tab===id?'var(--green)':'var(--text-muted)',background:'transparent',border:'none',borderBottom:`2px solid ${tab===id?'var(--green)':'transparent'}`}}>{labels[i]}</button>);})}</div>
      </div>
      <SignOutDialog isOpen={showSignOut} userName={facName} onCancel={()=>setShowSignOut(false)} onConfirm={async()=>{setShowSignOut(false);await signOut();}} />
  {note&&<div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl font-mono text-xs font-bold animate-toast-in" style={{background:'var(--surface)',border:'1px solid var(--border-md)',boxShadow:'0 8px 24px rgba(0,0,0,0.4)',color:'var(--foreground)'}}>{note}</div>}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {tab==='overview'&&(
          <div className="space-y-4 animate-fade-slide-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Total Members',members.length,'var(--blue)'],['Avg Points',members.length?(members.reduce((s,m)=>s+(m.monthly_points??0),0)/members.length).toFixed(1):'0','var(--yellow)'],['Synced Today',members.filter(m=>m.last_synced&&new Date(m.last_synced).toDateString()===new Date().toDateString()).length,'var(--green)'],['50+ pts',members.filter(m=>(m.monthly_points??0)>=50).length,'var(--purple)']].map(([l,v,c])=>(
                <div key={l as string} className="glass-card text-center py-4"><p className="font-black text-3xl font-mono" style={{color:c as string}}>{v}</p><p className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{color:'var(--text-muted)'}}>{l}</p></div>
              ))}
            </div>
            <div className="glass-card"><p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-3" style={{color:'var(--text-muted)'}}>{t('fac.tier_dist')}</p>
              {TIERS.map(t=>{const c=members.filter(m=>(m.monthly_points??0)>=t.min).length,pct=members.length?Math.round((c/members.length)*100):0;return(<div key={t.name} className="mb-2"><div className="flex justify-between font-mono text-[10px] mb-1"><span style={{color:'var(--foreground)'}}>{t.name}</span><span style={{color:'var(--text-muted)'}}>{c} ({pct}%)</span></div><div className="h-2 rounded-full overflow-hidden" style={{background:'var(--surface-alt)'}}><div className="h-full rounded-full animate-progress" style={{width:`${pct}%`,background:'var(--blue)'}}/></div></div>);})}</div>
            <div className="glass-card"><p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-3" style={{color:'var(--text-muted)'}}>Milestone Progress (pts estimate)</p>
              <div className="grid grid-cols-3 gap-3">{[['M1 Ready','≥15',15,'var(--green)'],['M2 Ready','≥25',25,'var(--blue)'],['Ultimate','≥50',50,'var(--yellow)']].map(([l,d,min,c])=>{const cnt=members.filter(m=>(m.monthly_points??0)>=(min as number)).length;return(<div key={l as string} className="text-center p-3 rounded-xl" style={{background:'var(--surface-alt)',border:'1px solid var(--border-md)'}}><p className="font-black text-2xl font-mono" style={{color:c as string}}>{cnt}</p><p className="font-mono text-[9px] font-bold uppercase" style={{color:'var(--foreground)'}}>{l}</p><p className="font-mono text-[8px]" style={{color:'var(--text-muted)'}}>{d}</p></div>);})}
              </div></div>
          </div>
        )}
        {tab==='members'&&(
          <div className="space-y-3 animate-fade-slide-up">
            <div className="flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('fac.members.search')} className="glass-input py-2 text-xs flex-1"/><button onClick={syncAll} disabled={locked} className="btn-cyan text-[9px] px-4 py-2 whitespace-nowrap"><UpdateIcon className={`w-3 h-3 ${locked?'animate-spin':''}`}/>{locked?'Syncing…':`Sync All (${members.length})`}</button></div>
            <div className="glass-card" style={{padding:'0.75rem'}}>
              <div className="grid font-mono text-[9px] font-bold uppercase tracking-widest px-3 py-2 mb-1 rounded-lg" style={{gridTemplateColumns:'1fr 5rem 5rem 5.5rem 7rem',background:'var(--surface-alt)',color:'var(--text-muted)'}}><span>{t('fac.members.col.name')}</span><span className="text-right">{t('fac.members.col.pts')}</span><span className="text-right">{t('fac.members.col.tier')}</span><span className="text-right">{t('fac.members.col.synced')}</span><span className="text-right">{t('fac.members.col.action')}</span></div>
              <div className="space-y-1 max-h-[480px] overflow-y-auto no-scrollbar">{filtered.map(m=>(
                <div key={m.id} className="grid items-center px-3 py-2.5 rounded-xl" style={{gridTemplateColumns:'1fr 5rem 5rem 5.5rem 7rem',background:'var(--surface-alt)',border:'1px solid var(--border)'}}>
                  <div className="min-w-0"><p className="font-medium text-xs truncate" style={{color:'var(--foreground)'}}>{m.name||'—'}</p><p className="font-mono text-[9px] truncate" style={{color:'var(--text-muted)'}}>{m.profile_url}</p></div>
                  <span className="text-right font-mono text-xs font-bold" style={{color:'var(--yellow)'}}>{(m.monthly_points??0).toFixed(1)}</span>
                  <span className="text-right font-mono text-[9px]" style={{color:'var(--blue)'}}>{tier(m.monthly_points??0)}</span>
                  <span className="text-right font-mono text-[9px]" style={{color:'var(--text-muted)'}}>{m.last_synced?new Date(m.last_synced).toLocaleDateString():t('fac.members.never')}</span>
                  <div className="flex justify-end gap-1.5"><button onClick={()=>syncMember(m.id)} disabled={syncId===m.id||locked} className="btn-cyan text-[8px] px-2 py-1"><UpdateIcon className={`w-2.5 h-2.5 ${syncId===m.id?'animate-spin':''}`}/></button><button onClick={()=>removeMember(m.id)} className="text-[8px] px-2 py-1 rounded font-mono font-bold" style={{background:'var(--red-dim)',color:'var(--red)',border:'1px solid var(--red-border)'}}>✕</button></div>
                </div>
              ))}{!filtered.length&&<div className="py-10 text-center"><p className="font-mono text-xs" style={{color:'var(--text-muted)'}}>{t('fac.members.empty')}</p></div>}</div>
            </div>
          </div>
        )}
        {tab==='import'&&(
          <div className="space-y-4 animate-fade-slide-up">
            <div className="glass-card space-y-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--blue)'}}>{t('fac.import.title')}</p>
              <div className="p-3 rounded-lg font-mono text-[9px]" style={{background:'var(--surface-alt)',border:'1px dashed var(--border-md)',color:'var(--text-muted)'}}><p className="font-bold mb-1">Format CSV:</p><p>profile_url</p><p>https://www.skills.google/public_profiles/xxx</p></div>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCsv} className="hidden"/>
              <button onClick={()=>fileRef.current?.click()} className="btn-cyan w-full text-xs py-3">{csvFile?`🗐 ${csvFile}`:'🗁 Choose CSV File'}</button>
            </div>
            {csvPrev.length>0&&(
              <div className="glass-card space-y-3">
                <div className="flex justify-between items-center">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-muted)'}}>Preview ({csvPrev.length})</p>
                  <div className="flex gap-3 font-mono text-[9px]"><span style={{color:'var(--green)'}}>✓ {csvPrev.filter(r=>r.valid&&!r.dup).length} new</span><span style={{color:'var(--yellow)'}}>⊙ {csvPrev.filter(r=>r.dup).length} dup</span><span style={{color:'var(--red)'}}>✕ {csvPrev.filter(r=>!r.valid).length} invalid</span></div>
                </div>
                <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1">{csvPrev.slice(0,40).map((r,i)=>(
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{background:'var(--surface-alt)',border:'1px solid var(--border)'}}>
                    <span className="text-xs shrink-0">{r.dup?'🟡':r.valid?'🟢':'🔴'}</span>
                    <span className="font-mono text-[9px] truncate" style={{color:r.dup?'var(--yellow)':r.valid?'var(--green)':'var(--red)'}}>{r.url}</span>
                    {r.dup&&<span className="tag tag-gold text-[7px] shrink-0">DUP</span>}
                  </div>
                ))}</div>
                <button onClick={doImport} disabled={importing||csvPrev.filter(r=>r.valid&&!r.dup).length===0} className="btn-primary w-full text-xs py-2.5">{importing ? t('fac.import.importing') : `Import ${csvPrev.filter(r=>r.valid&&!r.dup).length} Members`}</button>
              </div>
            )}
          </div>
        )}
        {tab==='history'&&(
          <div className="glass-card animate-fade-slide-up space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-muted)'}}>{t('fac.history.title')}</p>
            {batches.length===0&&<p className="text-center text-xs py-8" style={{color:'var(--text-muted)'}}>{t('fac.history.empty')}</p>}
            {batches.map(b=>(
              <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{background:'var(--surface-alt)',border:'1px solid var(--border)',opacity:b.rolled_back?0.5:1}}>
                <div className="min-w-0"><p className="font-mono text-xs font-bold truncate" style={{color:'var(--foreground)'}}>{b.file_name}</p><p className="font-mono text-[9px]" style={{color:'var(--text-muted)'}}>{new Date(b.created_at).toLocaleString()} · {b.total} total · <span style={{color:'var(--green)'}}>{b.successful} ok</span> · <span style={{color:'var(--red)'}}>{b.failed} failed</span></p></div>
                {b.rolled_back?<span className="tag tag-gray text-[8px]">{t('fac.history.rolled')}</span>:<button onClick={()=>rollback(b.id)} className="text-[8px] px-3 py-1.5 rounded-lg font-mono font-bold whitespace-nowrap" style={{background:'var(--red-dim)',color:'var(--red)',border:'1px solid var(--red-border)'}}>{t('fac.history.rollback')}</button>}
              </div>
            ))}
          </div>
        )}
        {tab==='email'&&(
          <div className="space-y-3 animate-fade-slide-up">
            <div className="glass-card space-y-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--blue)'}}>{t('fac.email.title')}</p>
              <div><label className="font-mono text-[9px] font-bold uppercase tracking-widest block mb-1.5" style={{color:'var(--text-muted)'}}>{t('fac.email.subject')}</label><input value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} className="glass-input py-2 text-xs"/></div>
              <div className="flex justify-between items-center"><p className="font-mono text-[10px]" style={{color:'var(--text-muted)'}}>{t('fac.email.select_lbl')}</p><button onClick={()=>setSelected(s=>s.size===members.length?new Set():new Set(members.map(m=>m.id)))} className="btn-ghost text-[9px] px-2 py-1">{selected.size===members.length?'Deselect All':'Select All'}</button></div>
              <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1">{members.map(m=>(
                <label key={m.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer" style={{background:selected.has(m.id)?'var(--blue-dim)':'var(--surface-alt)',border:`1px solid ${selected.has(m.id)?'var(--blue-border)':'var(--border)'}`}}>
                  <input type="checkbox" checked={selected.has(m.id)} onChange={e=>{setSelected(s=>{const n=new Set(s);e.target.checked?n.add(m.id):n.delete(m.id);return n;})}} className="accent-blue-500"/>
                  <span className="font-mono text-xs truncate" style={{color:'var(--foreground)'}}>{m.name||m.profile_url}</span>
                  <span className="font-mono text-[9px] ml-auto" style={{color:'var(--yellow)'}}>{(m.monthly_points??0).toFixed(1)} pts</span>
                </label>
              ))}</div>
              <p className="font-mono text-[9px]" style={{color:'var(--text-muted)'}}>⚠︎ Requires RESEND_API_KEY + FROM_EMAIL env vars.</p>
              <button onClick={sendEmails} disabled={sending||selected.size===0} className="btn-primary w-full text-xs py-2.5">{sending ? t('fac.email.sending') : `Send to ${selected.size} members`}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
