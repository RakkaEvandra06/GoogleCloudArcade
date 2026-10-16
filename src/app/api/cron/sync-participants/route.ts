import { NextResponse } from 'next/server';
import {
  getParticipants,
  getSystemSetting,
  setSystemSetting,
  setBadges,
  updateParticipant,
} from '@/lib/db';
import { verifyCronSecret, validateUUID, logSecurity } from '@/lib/security';
import { scrapeProfile, ScrapeError } from '@/lib/scrapeProfile';

export const dynamic = 'force-dynamic';
export const runtime  = 'nodejs';

// ── Serverless-safe deduplication ─────────────────────────────────────────────

const DEDUP_KEY    = 'cron_sync_participants_last_run';
const MIN_INTERVAL = 5 * 60 * 1_000; // 5 minutes

async function shouldRun(): Promise<boolean> {
  const stored  = await getSystemSetting(DEDUP_KEY);
  const lastRun = stored ? Number(stored) : 0;
  return isNaN(lastRun) || Date.now() - lastRun >= MIN_INTERVAL;
}

async function markRan(): Promise<void> {
  await setSystemSetting(DEDUP_KEY, String(Date.now()));
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!(await shouldRun())) {
    return NextResponse.json(
      { message: 'Run skipped: job executed recently. Try again later.' },
      { status: 429 },
    );
  }
  await markRan();

  let participants: Awaited<ReturnType<typeof getParticipants>>;
  try {
    participants = await getParticipants();
  } catch {
    logSecurity('error', 'api_error', { route: 'cron/sync-participants', step: 'fetch' });
    return NextResponse.json({ error: 'Failed to fetch participants.' }, { status: 500 });
  }

  const result = {
    job:        'sync-participants',
    total:      participants.length,
    success:    0,
    skipped:    0,
    failed:     0,
    startedAt:  new Date().toISOString(),
    finishedAt: '',
  };

  for (const p of participants) {
    if (!validateUUID(p.id)) {
      result.skipped++;
      logSecurity('warn', 'invalid_uuid', { route: 'cron/sync-participants' });
      continue;
    }

    try {
      const data = await scrapeProfile(p.profile_url);
      await setBadges(p.id, data.badges);
      await updateParticipant(p.id, {
        name:        data.name        || p.name,
        avatar_url:  data.avatar_url  || p.avatar_url,
        last_synced: data.scraped_at,
      });
      result.success++;
    } catch (err) {
      result.failed++;
      if (!(err instanceof ScrapeError)) {
        logSecurity('warn', 'sync_error', {
          route: 'cron/sync-participants',
          step:  'scrape_participant',
        });
      }
    }

    // Throttle to ≈ 0.67 req/s to avoid triggering Skills Boost rate limits.
    await new Promise<void>(r => setTimeout(r, 1_500));
  }

  result.finishedAt = new Date().toISOString();
  logSecurity('info', 'cron_completed', {
    job:     result.job,
    total:   result.total,
    success: result.success,
    failed:  result.failed,
  });

  return NextResponse.json({ message: 'Sync completed.', ...result });
}
