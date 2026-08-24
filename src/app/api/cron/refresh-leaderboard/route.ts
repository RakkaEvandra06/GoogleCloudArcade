import { NextResponse } from 'next/server';
import { getParticipants, getBadges, updateParticipant } from '@/lib/db';
import { verifyCronSecret, validateUUID, logSecurity } from '@/lib/security';

/** Periode aktif Arcade 2026 */
const ACTIVE_START = '2026-07-01';

const MIN_INTERVAL_MS = 5 * 60 * 1_000;
let lastRunAt = 0;

export const dynamic = 'force-dynamic';
export const runtime  = 'nodejs';

export async function GET(request: Request) {
  /* ── Auth ─────────────────────────────────────────────────────────── */
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  /* ── Deduplication guard ──────────────────────────────────────────── */
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) {
    return NextResponse.json(
      { message: 'Sudah berjalan baru-baru ini. Coba lagi nanti.' },
      { status: 429 },
    );
  }
  lastRunAt = now;

  /* ── Fetch all participants ───────────────────────────────────────── */
  let participants: Awaited<ReturnType<typeof getParticipants>>;
  try {
    participants = await getParticipants();
  } catch {
    logSecurity('error', 'api_error', { route: 'cron/refresh-leaderboard', step: 'fetch' });
    return NextResponse.json({ error: 'Gagal mengambil data peserta.' }, { status: 500 });
  }

  const result = {
    job:        'refresh-leaderboard',
    timezone:   'Asia/Jakarta (WIB, UTC+7)',
    scheduledAt:'23:30 WIB',
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

  /* ── Recalculate points per participant ───────────────────────────── */
  for (const p of participants) {
    if (!validateUUID(p.id)) {
      result.skipped++;
      logSecurity('warn', 'invalid_uuid', { route: 'cron/refresh-leaderboard' });
      continue;
    }

    try {
      const badges  = await getBadges(p.id);
      const active  = badges.filter(b => b.earned_date >= ACTIVE_START);
      const games   = active.filter(b => b.category === 'game').length;
      const skills  = active.filter(b => b.category === 'skill_badge').length;
      const points  = games + skills * 0.5;

      await updateParticipant(p.id, { monthly_points: points });
      result.updated++;
    } catch {
      result.failed++;
      logSecurity('warn', 'sync_error', {
        route: 'cron/refresh-leaderboard',
        step:  'recalculate',
      });
    }

    /* Kecil jeda agar tidak membanjiri DB read */
    await new Promise<void>(r => setTimeout(r, 200));
  }

  /* ── Build fresh leaderboard snapshot ────────────────────────────── */
  try {
    const fresh = await getParticipants();       // re-fetch setelah update
    result.leaderboard = fresh
      .sort((a, b) => (b.monthly_points ?? 0) - (a.monthly_points ?? 0))
      .slice(0, 50)
      .map((p, i) => ({
        rank:   i + 1,
        name:   p.name,
        points: p.monthly_points ?? 0,
        /* games & skills tidak tersimpan di baris participants,
           tapi leaderboard cukup tampilkan poin untuk snapshot */
        games:  0,
        skills: 0,
      }));
  } catch {
    logSecurity('warn', 'api_error', { route: 'cron/refresh-leaderboard', step: 'snapshot' });
  }

  result.finishedAt = new Date().toISOString();
  logSecurity('info', 'cron_completed', {
    job:     result.job,
    total:   result.total,
    updated: result.updated,
    failed:  result.failed,
    top1:    result.leaderboard[0]?.name ?? '—',
    top1pts: result.leaderboard[0]?.points ?? 0,
  });

  return NextResponse.json({
    message: 'Leaderboard berhasil diperbarui.',
    ...result,
  });
}
