import { NextResponse } from 'next/server';
import { getParticipants } from '@/lib/db';
import { verifyCronSecret, validateUUID, logSecurity } from '@/lib/security';

const MIN_INTERVAL_MS = 5 * 60 * 1_000;
let lastRunAt = 0;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

  /* ── Fetch participants ───────────────────────────────────────────── */
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

  const baseUrl = new URL(request.url).origin;
  const authHeader = request.headers.get('authorization') ?? '';

  /* ── Sync each participant sequentially ──────────────────────────── */
  for (const p of participants) {
    if (!validateUUID(p.id)) {
      result.skipped++;
      logSecurity('warn', 'invalid_uuid', { route: 'cron/sync-participants' });
      continue;
    }

    try {
      const res = await fetch(
        `${baseUrl}/api/participants/${encodeURIComponent(p.id)}`,
        {
          method:  'POST',
          headers: { Authorization: authHeader },
          signal:  AbortSignal.timeout(30_000),
        },
      );
      res.ok ? result.success++ : result.failed++;
    } catch {
      result.failed++;
      logSecurity('warn', 'sync_error', { route: 'cron/sync-participants', step: 'fetch_participant' });
    }

    /* 1,5 detik jeda agar tidak membanjiri Skills Boost */
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
