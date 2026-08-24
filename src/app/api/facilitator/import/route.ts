import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getParticipantByUrl, addParticipant, addFacilitatorMember, createUploadBatch, createAuditLog, setBadges, updateParticipant } from '@/lib/db';
import { validateProfileUrl, sanitizeString, checkRateLimit, getClientIP, requireJsonContentType, validateOrigin, logSecurity } from '@/lib/security';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const ip = getClientIP(req);
  if (!checkRateLimit(`fac-import:${ip}`, 3, 300)) return NextResponse.json({ error:'Rate limit.' }, { status:429 });
  const s = await getSession(); if (s?.role !== 'facilitator') return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  let body: Record<string,unknown>; try { body = await req.json(); } catch { return NextResponse.json({ error:'Invalid body.' }, { status:400 }); }
  const rows = (body.rows as string[]) ?? [];
  const fileName = sanitizeString(body.file_name as string ?? 'import.csv', 200);
  const base = new URL(req.url).origin;
  let success = 0, failed = 0;
  const results: { url:string; status:'ok'|'error'; message?:string }[] = [];
  const batch = await createUploadBatch(s.facCode!, fileName, rows.length, 0, 0);
  const batchId = batch?.id ?? null;
  for (const rawUrl of rows) {
    const url = sanitizeString(rawUrl, 2000);
    const v = validateProfileUrl(url);
    if (!v.ok) { failed++; results.push({ url, status:'error', message:v.error }); continue; }
    try {
      let p = await getParticipantByUrl(url);
      if (!p) {
        p = await addParticipant({ name:'', profile_url:url, role:'participant' });
        const sr = await fetch(`${base}/api/scrape?url=${encodeURIComponent(url)}`, { cache:'no-store', signal:AbortSignal.timeout(20000) });
        if (sr.ok) { const d=await sr.json(); await setBadges(p.id,d.badges??[]); await updateParticipant(p.id,{ name:d.name||'', avatar_url:d.avatar_url, last_synced:d.scraped_at }); }
      }
      await addFacilitatorMember(s.facCode!, p.id, 'csv', batchId);
      success++; results.push({ url, status:'ok' });
    } catch { failed++; results.push({ url, status:'error', message:'Processing failed.' }); }
    await new Promise<void>(r => setTimeout(r, 500));
  }
  await createAuditLog(s.facCode!, 'csv_import', undefined, { file:fileName, total:rows.length, success, failed });
  return NextResponse.json({ ok:true, successful:success, failed, batchId, results });
}
