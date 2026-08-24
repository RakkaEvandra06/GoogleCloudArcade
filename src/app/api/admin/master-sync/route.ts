import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getParticipants, getSystemSetting, createAuditLog } from '@/lib/db';
import { validateUUID, checkRateLimit, getClientIP, validateOrigin, logSecurity } from '@/lib/security';
export const dynamic = 'force-dynamic';

let isRunning = false;

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ip = getClientIP(req);
  if (!checkRateLimit(`admin-sync-status:${ip}`, 60, 60)) return NextResponse.json({ error: 'Rate limit.' }, { status: 429 });
  return NextResponse.json({ isRunning });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // CSRF protection
  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-master-sync' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // Strict rate limit: master sync is expensive
  const ip = getClientIP(req);
  if (!checkRateLimit(`master-sync:${ip}`, 2, 300))
    return NextResponse.json({ error: 'Rate limit: master sync can run at most 2× per 5 minutes.' }, { status: 429 });

  if (isRunning) return NextResponse.json({ error: 'Master sync already in progress.' }, { status: 409 });
  if ((await getSystemSetting('maintenance_mode')) === 'true')
    return NextResponse.json({ error: 'System in maintenance mode.' }, { status: 503 });

  isRunning = true;
  const participants = await getParticipants();
  const base = new URL(req.url).origin;
  let success = 0, failed = 0;

  for (const p of participants) {
    if (!validateUUID(p.id)) { failed++; continue; }
    try {
      const r = await fetch(`${base}/api/participants/${encodeURIComponent(p.id)}`, {
        method: 'POST',
        signal: AbortSignal.timeout(25_000),
        headers: { 'Content-Type': 'application/json' },
      });
      r.ok ? success++ : failed++;
    } catch { failed++; }
    await new Promise<void>(r => setTimeout(r, 1000));
  }

  isRunning = false;
  await createAuditLog('admin', 'master_sync', undefined, { total: participants.length, success, failed });
  return NextResponse.json({ ok: true, total: participants.length, success, failed, finishedAt: new Date().toISOString() });
}
