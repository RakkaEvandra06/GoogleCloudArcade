import { NextResponse } from 'next/server';
import { getParticipants, getParticipantCount } from '@/lib/db';
import { getSession } from '@/lib/session';
import { checkRateLimit, getClientIP } from '@/lib/security';

export const dynamic = 'force-dynamic';

const MAX_LIMIT  = 100;
const MAX_OFFSET = 100_000;

export async function GET(req: Request) {
  // ── Auth: admin or facilitator only ───────────────────────────────────────
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'facilitator')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`participants-list:${ip}`, 30, 60)) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  // ── Pagination parameters ─────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(MAX_LIMIT,  Math.max(1, parseInt(searchParams.get('limit')  ?? '50')));
  const offset = Math.min(MAX_OFFSET, Math.max(0, parseInt(searchParams.get('offset') ?? '0')));

  try {
    const [participants, total] = await Promise.all([
      getParticipants(limit, offset),
      getParticipantCount(),
    ]);
    return NextResponse.json({ participants, total, limit, offset });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch participants.' }, { status: 500 });
  }
}
