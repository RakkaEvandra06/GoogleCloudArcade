import { NextResponse } from 'next/server';
import { getParticipants } from '@/lib/db';
import { getSession } from '@/lib/session';
import { checkRateLimit, getClientIP } from '@/lib/security';

export const dynamic = 'force-dynamic';

const MAX_LIMIT  = 100;
const MAX_OFFSET = 10_000;

export async function GET(req: Request) {
  // ── Auth: admin or facilitator only ───────────────────────────────────────
  // Previously unauthenticated — any anonymous request could dump every
  // participant's name, profile URL, avatar and scores.
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'facilitator')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`participants-list:${ip}`, 30, 60)) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(MAX_LIMIT,  Math.max(1, parseInt(searchParams.get('limit')  ?? '50')));
  const offset = Math.min(MAX_OFFSET, Math.max(0, parseInt(searchParams.get('offset') ?? '0')));

  try {
    // NOTE: pass { limit, offset } once getParticipants() in db.ts supports
    // those parameters. Until then this adds auth + rate-limit protection and
    // lays the correct API contract.
    const participants = await getParticipants();
    const page = participants.slice(offset, offset + limit);
    return NextResponse.json({ participants: page, total: participants.length, limit, offset });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch participants.' }, { status: 500 });
  }
}
