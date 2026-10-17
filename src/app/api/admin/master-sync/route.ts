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
import {
  validateUUID,
  checkRateLimit,
  getClientIP,
  validateOrigin,
  logSecurity,
} from '@/lib/security';
import { scrapeProfile, ScrapeError } from '@/lib/scrapeProfile';

// Supabase client for raw RPC call
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const LOCK_KEY    = 'master_sync_lock';
const LOCK_TTL_MS = 30 * 60 * 1_000; // 30 minutes

async function acquireSyncLock(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const db = createClient(url, key, { auth: { persistSession: false } });

  // Try the atomic RPC first.
  const { data, error } = await db.rpc('acquire_sync_lock', {
    lock_key: LOCK_KEY,
    ttl_ms:   LOCK_TTL_MS,
  });

  if (!error) {
    // RPC exists and returned a boolean result.
    return data === true;
  }

  logSecurity('warn', 'api_error', {
    route:  'master-sync/acquireSyncLock',
    reason: 'rpc_not_found_using_fallback',
    msg:    error.message,
  });
  const current  = await getSystemSetting(LOCK_KEY);
  const lockedAt = current ? Number(current) : 0;
  if (!isNaN(lockedAt) && lockedAt > 0 && Date.now() - lockedAt < LOCK_TTL_MS) return false;
  await setSystemSetting(LOCK_KEY, String(Date.now()));
  return true;
}

async function releaseSyncLock(): Promise<void> {
  await setSystemSetting(LOCK_KEY, '0');
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`admin-sync-status:${ip}`, 60, 60)) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const current   = await getSystemSetting(LOCK_KEY);
  const lockedAt  = current ? Number(current) : 0;
  const isRunning = !isNaN(lockedAt) && lockedAt > 0 && Date.now() - lockedAt < LOCK_TTL_MS;
  return NextResponse.json({ isRunning });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-master-sync' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`master-sync:${ip}`, 2, 300)) {
    return NextResponse.json(
      { error: 'Rate limit: master sync can run at most 2× per 5 minutes.' },
      { status: 429 },
    );
  }

  if ((await getSystemSetting('maintenance_mode')) === 'true') {
    return NextResponse.json({ error: 'System is in maintenance mode.' }, { status: 503 });
  }

  const acquired = await acquireSyncLock();
  if (!acquired) {
    return NextResponse.json(
      { error: 'Master sync is already in progress.' },
      { status: 409 },
    );
  }

  const participants = await getParticipants();
  let success = 0, failed = 0;

  try {
    for (const p of participants) {
      if (!validateUUID(p.id)) { failed++; continue; }

      try {
        const data = await scrapeProfile(p.profile_url);
        await setBadges(p.id, data.badges);
        await updateParticipant(p.id, {
          name:        data.name        || p.name,
          avatar_url:  data.avatar_url  || p.avatar_url,
          last_synced: data.scraped_at,
        });
        success++;
      } catch (err) {
        failed++;
        if (!(err instanceof ScrapeError)) {
          logSecurity('warn', 'sync_error', { route: 'admin/master-sync', id: p.id });
        }
      }

      // Throttle outbound requests to Skills Boost (~1 req/s).
      await new Promise<void>(r => setTimeout(r, 1_000));
    }
  } finally {
    // Always release the lock, even if an unexpected error aborts the loop.
    await releaseSyncLock();
  }

  await createAuditLog('admin', 'master_sync', undefined, {
    total: participants.length,
    success,
    failed,
  });

  return NextResponse.json({
    ok:         true,
    total:      participants.length,
    success,
    failed,
    finishedAt: new Date().toISOString(),
  });
}
