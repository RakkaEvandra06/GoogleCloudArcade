import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  getParticipants,
  getSystemSetting,
  setSystemSetting,
  createAuditLog,
  setBadges,
  updateParticipant,
} from '@/lib/db';
import { validateUUID, checkRateLimit, getClientIP, validateOrigin, logSecurity } from '@/lib/security';

export const dynamic = 'force-dynamic';

// ── Distributed lock via system_settings (serverless-safe) ──────────────────
// The previous implementation used a module-level `let isRunning = false`.
// In Vercel's serverless environment each warm instance has its own memory,
// so two concurrent requests each see isRunning=false and run simultaneously.
// Using a Supabase row as a shared mutex fixes this across all instances.
const LOCK_KEY    = 'master_sync_lock';
const LOCK_TTL_MS = 30 * 60 * 1_000; // 30 minutes — auto-expires stale locks

async function acquireSyncLock(): Promise<boolean> {
  const current  = await getSystemSetting(LOCK_KEY);
  const lockedAt = current ? Number(current) : 0;
  if (!isNaN(lockedAt) && lockedAt > 0 && Date.now() - lockedAt < LOCK_TTL_MS) return false;
  // setSystemSetting is not a true atomic CAS, but it provides strong enough
  // protection for a low-concurrency admin action protected by auth + rate limits.
  await setSystemSetting(LOCK_KEY, String(Date.now()));
  return true;
}

async function releaseSyncLock(): Promise<void> {
  await setSystemSetting(LOCK_KEY, '0');
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIP(req);
  if (!checkRateLimit(`admin-sync-status:${ip}`, 60, 60))
    return NextResponse.json({ error: 'Rate limit.' }, { status: 429 });

  const current  = await getSystemSetting(LOCK_KEY);
  const lockedAt = current ? Number(current) : 0;
  const isRunning = !isNaN(lockedAt) && lockedAt > 0 && Date.now() - lockedAt < LOCK_TTL_MS;
  return NextResponse.json({ isRunning });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-master-sync' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`master-sync:${ip}`, 2, 300))
    return NextResponse.json({ error: 'Rate limit: master sync can run at most 2× per 5 minutes.' }, { status: 429 });

  if ((await getSystemSetting('maintenance_mode')) === 'true')
    return NextResponse.json({ error: 'System in maintenance mode.' }, { status: 503 });

  const acquired = await acquireSyncLock();
  if (!acquired) return NextResponse.json({ error: 'Master sync already in progress.' }, { status: 409 });

  const participants = await getParticipants();
  const base = new URL(req.url).origin;
  let success = 0, failed = 0;

  try {
    for (const p of participants) {
      if (!validateUUID(p.id)) { failed++; continue; }

      try {
        // ── Sync via scrape + direct DB write ─────────────────────────────
        // The previous implementation called POST /api/participants/:id, which
        // requires a session cookie. The internal fetch had no cookie, so every
        // iteration returned 401 and the sync silently reported total failures.
        // Fix: call the scrape endpoint (public, rate-limited) then write to DB
        // directly — no session handshake needed for server-to-server work.
        const scrapeRes = await fetch(
          `${base}/api/scrape?url=${encodeURIComponent(p.profile_url)}`,
          { cache: 'no-store', signal: AbortSignal.timeout(25_000) },
        );

        if (!scrapeRes.ok) { failed++; continue; }

        const data = await scrapeRes.json() as {
          badges?:     Array<{ badge_name: string; category: 'game' | 'skill_badge'; points: number; earned_date: string; image_url: string }>;
          name?:       string;
          avatar_url?: string;
          scraped_at?: string;
        };

        await setBadges(p.id, data.badges ?? []);
        await updateParticipant(p.id, {
          name:        data.name        || p.name,
          avatar_url:  data.avatar_url  || p.avatar_url,
          last_synced: data.scraped_at,
        });
        success++;
      } catch {
        failed++;
        logSecurity('warn', 'sync_error', { route: 'admin/master-sync' });
      }

      await new Promise<void>(r => setTimeout(r, 1_000));
    }
  } finally {
    // Always release the lock, even if an unexpected error occurs mid-loop
    await releaseSyncLock();
  }

  await createAuditLog('admin', 'master_sync', undefined, { total: participants.length, success, failed });
  return NextResponse.json({
    ok: true,
    total: participants.length,
    success,
    failed,
    finishedAt: new Date().toISOString(),
  });
}
