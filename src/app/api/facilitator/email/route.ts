import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getParticipant, getBadges } from '@/lib/db';
import { sanitizeString, checkRateLimit, getClientIP, validateUUID } from '@/lib/security';
export const dynamic = 'force-dynamic';
const ACTIVE = '2026-07-01';
function emailHtml(name:string,pts:number,games:number,skills:number,m1:boolean,m2:boolean,m3:boolean){
  const tier=pts>=120?'🏆 Legend':pts>=95?'👑 Champion':pts>=75?'🎯 Ranger':pts>=50?'🛡️ Trooper':'Unranked';
  const ms=m3?'Ultimate ✓':m2?'Milestone 2 ✓':m1?'Milestone 1 ✓':'No milestone yet';
  return `<!DOCTYPE html><body style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f0f4f8;padding:24px"><div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0"><h2 style="color:#4285f4">🎮 Arcade 2026 — Progress Report</h2><p>Hi <strong>${name}</strong>!</p><table style="width:100%"><tr><td><b>Points</b></td><td style="text-align:right;color:#4285f4;font-weight:bold">${pts.toFixed(1)}</td></tr><tr><td><b>Games</b></td><td style="text-align:right">${games}</td></tr><tr><td><b>Skills</b></td><td style="text-align:right">${skills}</td></tr><tr><td><b>Tier</b></td><td style="text-align:right">${tier}</td></tr><tr><td><b>Milestone</b></td><td style="text-align:right;color:#34a853">${ms}</td></tr></table></div></body>`;
}
export async function POST(req: Request) {
  const ip = getClientIP(req);
  if (!checkRateLimit(`fac-email:${ip}`, 2, 300)) return NextResponse.json({ error:'Rate limit.' }, { status:429 });
  const s = await getSession(); if (s?.role !== 'facilitator') return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const key = process.env.RESEND_API_KEY; const from = process.env.FROM_EMAIL??'noreply@arcadetrack.app';
  if (!key) return NextResponse.json({ error:'RESEND_API_KEY not configured.' }, { status:503 });
  let body: Record<string,unknown>; try { body = await req.json(); } catch { return NextResponse.json({ error:'Invalid body.' }, { status:400 }); }
  const ids = (body.member_ids as string[])??[];
  const subject = sanitizeString(body.subject as string??'Your Arcade 2026 Progress', 200);
  let sent=0,failed=0;
  for (const id of ids) {
    if (!validateUUID(id)) continue;
    try {
      const p=await getParticipant(id); if (!p) continue;
      const badges=await getBadges(id);
      const m=badges.filter(b=>b.earned_date>=ACTIVE);
      const games=m.filter(b=>b.category==='game').length, skills=m.filter(b=>b.category==='skill_badge').length;
      const pts=p.monthly_points??0, m1=games>=1&&skills>=7, m2=games>=3&&skills>=14, m3=games>=8&&skills>=28;
      const to=[sanitizeString(body.override_email as string??`${p.id.slice(0,8)}@placeholder.com`, 200)];
      const r=await fetch('https://api.resend.com/emails',{ method:'POST', headers:{ Authorization:`Bearer ${key}`,'Content-Type':'application/json' }, body:JSON.stringify({ from, to, subject, html:emailHtml(p.name||'Learner',pts,games,skills,m1,m2,m3) }) });
      r.ok?sent++:failed++;
    } catch { failed++; }
    await new Promise<void>(r=>setTimeout(r,300));
  }
  return NextResponse.json({ ok:true, sent, failed });
}
