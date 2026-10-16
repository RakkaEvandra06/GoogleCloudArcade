import { NextResponse } from 'next/server';
import {
  getParticipants,
  getAllActiveBadgesGrouped,
  updateParticipant,
  getSystemSetting,
  setSystemSetting,
} from '@/lib/db';
import { verifyCronSecret, validateUUID, logSecurity } from '@/lib/security';
import { calcArcadePoints, ACTIVE_PERIOD_START } from '@/lib/scoring';

export const dynamic = 'force-dynamic';
export const runtime  = 'nodejs';

const DEDUP_KEY    = 'cron_refresh_leaderboard_last_run';
const MIN_INTERVAL = 5 * 60 * 1_000;

async function shouldRun(): Promise<boolean> {
  const stored  = await getSystemSetting(DEDUP_KEY);
  const lastRun = stored ? Number(stored) : 0;
  return isNaN(lastRun) || Date.now() - lastRun >= MIN_INTERVAL;
}

async function markRan(): Promise<void> {
  await setSystemSetting(DEDUP_KEY, String(Date.now()));
}

type BadgeEntry = { category: string; earned_date: string };

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
    logSecurity('error', 'api_error', { route: 'cron/refresh-leaderboard', step: 'fetch' });
    return NextResponse.json({ error: 'Failed to fetch participants.' }, { status: 500 });
  }

  const result = {
    job:        'refresh-leaderboard',
    total:      participants.length,
    updated:    0,
    skipped:    0,
    failed:     0,
    startedAt:  new Date().toISOString(),
    finishedAt: '',
    leaderboard: [] as Array<{
      rank:   number;
      name:   string;
      points: number;
      games:  number;
      skills: number;
    }>,
  };

  let badgeMap: Map<string, BadgeEntry[]>;
  try {
    badgeMap = (await getAllActiveBadgesGrouped(ACTIVE_PERIOD_START)) as Map<string, BadgeEntry[]>;
  } catch {
    logSecurity('error', 'api_error', { route: 'cron/refresh-leaderboard', step: 'bulk-badges' });
    return NextResponse.json({ error: 'Failed to fetch badge data.' }, { status: 500 });
  }

  // Recalculate points for every participant without extra DB reads.
  const updatePromises = participants
    .filter(p => validateUUID(p.id))
    .map(async p => {
      try {
        const active = (badgeMap.get(p.id) ?? []).filter(b => b.earned_date >= ACTIVE_PERIOD_START);
        const games  = active.filter(b => b.category === 'game').length;
        const skills = active.filter(b => b.category === 'skill_badge').length;
        // M-5 FIX: calcArcadePoints() from scoring.ts instead of inline formula.
        const points = calcArcadePoints(games, skills);
        await updateParticipant(p.id, { monthly_points: points });
        result.updated++;
      } catch {
        result.failed++;
        logSecurity('warn', 'sync_error', {
          route: 'cron/refresh-leaderboard',
          step:  'recalculate',
        });
      }
    });

  await Promise.all(updatePromises);
  result.skipped = participants.filter(p => !validateUUID(p.id)).length;

  // Build fresh leaderboard snapshot from in-memory badge data.
  try {
    const fresh = await getParticipants();
    result.leaderboard = fresh
      .sort((a, b) => (b.monthly_points ?? 0) - (a.monthly_points ?? 0))
      .slice(0, 50)
      .map((p, i) => {
        const active = (badgeMap.get(p.id) ?? []).filter(b => b.earned_date >= ACTIVE_PERIOD_START);
        const games  = active.filter(b => b.category === 'game').length;
        const skills = active.filter(b => b.category === 'skill_badge').length;
        return { rank: i + 1, name: p.name, points: p.monthly_points ?? 0, games, skills };
      });
  } catch {
    logSecurity('warn', 'api_error', { route: 'cron/refresh-leaderboard', step: 'snapshot' });
  }

  result.finishedAt = new Date().toISOString();
  logSecurity('info', 'cron_completed', {
    job:     result.job,
    total:   result.total,
    updated: result.updated,
    failed:  result.failed,
    top1:    result.leaderboard[0]?.name   ?? '—',
    top1pts: result.leaderboard[0]?.points ?? 0,
  });

  return NextResponse.json({ message: 'Leaderboard refreshed successfully.', ...result });
}
