import { NextResponse } from 'next/server';
import {
  getParticipants,
  getSystemSetting,
  setSystemSetting,
  setBadges,
  updateParticipant,
} from '@/lib/db';
import { verifyCronSecret, validateUUID, logSecurity } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ── Serverless-safe deduplication ─────────────────────────────────────────────
// The previous implementation stored `lastRunAt` in module scope. In Vercel's
// serverless runtime each warm instance has independent memory, so two concurrent
// invocations both see lastRunAt=0 and execute in parallel. Using a Supabase row
// as shared state fixes this across all instances.
const DEDUP_KEY     = 'cron_sync_participants_last_run';
const MIN_INTERVAL  = 5 * 60 * 1_000; // 5 minutes

async function shouldRun(): Promise<boolean> {
  const stored  = await getSystemSetting(DEDUP_KEY);
  const lastRun = stored ? Number(stored) : 0;
  return isNaN(lastRun) || Date.now() - lastRun >= MIN_INTERVAL;
}

async function markRan(): Promise<void> {
  await setSystemSetting(DEDUP_KEY, String(Date.now()));
}

export async function GET(request: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // ── Deduplication guard ────────────────────────────────────────────────────
  if (!(await shouldRun())) {
    return NextResponse.json(
      { message: 'Sudah berjalan baru-baru ini. Coba lagi nanti.' },
      { status: 429 },
    );
  }
  await markRan();

  // ── Fetch participants ─────────────────────────────────────────────────────
  let participants: Awaited<ReturnType<typeof getParticipants>>;
  try {
    participants = await getParticipants();
  } catch {
    logSecurity('error', 'api_error', { route: 'cron/sync-participants', step: 'fetch' });
    return NextResponse.json({ error: 'Gagal mengambil data peserta.' }, { status: 500 });
  }

  const result = {
    job:        'sync-participants',
    timezone:   'Asia/Jakarta (WIB, UTC+7)',
    scheduledAt:'23:00 WIB',
    total:      participants.length,
    success:    0,
    skipped:    0,
    failed:     0,
    startedAt:  new Date().toISOString(),
    finishedAt: '',
  };

  const base = new URL(request.url).origin;

  // ── Sync each participant sequentially ─────────────────────────────────────
  for (const p of participants) {
    if (!validateUUID(p.id)) {
      result.skipped++;
      logSecurity('warn', 'invalid_uuid', { route: 'cron/sync-participants' });
      continue;
    }

    try {
      // ── Direct scrape + DB write ─────────────────────────────────────────
      // The previous implementation called POST /api/participants/:id and
      // forwarded the Authorization header from the cron secret request.
      // That endpoint requires a session *cookie*, not a bearer token, so
      // every iteration returned 401 and the cron job silently did nothing.
      //
      // Fix: call the scrape endpoint (unauthenticated, rate-limited by IP)
      // and write results directly to the DB — no session handshake needed.
      const scrapeRes = await fetch(
        `${base}/api/scrape?url=${encodeURIComponent(p.profile_url)}`,
        { cache: 'no-store', signal: AbortSignal.timeout(30_000) },
      );

      if (!scrapeRes.ok) { result.failed++; continue; }

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
      result.success++;
    } catch {
      result.failed++;
      logSecurity('warn', 'sync_error', { route: 'cron/sync-participants', step: 'fetch_participant' });
    }

    /* 1.5 s jeda agar tidak membanjiri Skills Boost */
    await new Promise<void>(r => setTimeout(r, 1_500));
  }

  result.finishedAt = new Date().toISOString();
  logSecurity('info', 'cron_completed', {
    job:     result.job,
    total:   result.total,
    success: result.success,
    failed:  result.failed,
  });

  return NextResponse.json({ message: 'Sinkronisasi selesai.', ...result });
}
