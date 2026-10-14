import { NextResponse } from 'next/server';
import { getParticipants, countParticipants } from '@/lib/db';
import {
  checkRateLimit,
  getClientIP,
  logSecurity,
  parsePosInt,
} from '@/lib/security';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_LIMIT  = 100;
const MAX_OFFSET = 50_000;

export async function GET(req: Request) {
  const session = await getSession();

  // Both admins and facilitators may access this endpoint; players may not.
  if (!session || (session.role !== 'admin' && session.role !== 'facilitator')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`participants-list:${ip}`, 60, 60)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);

  const limit  = parsePosInt(searchParams.get('limit'),  50, MAX_LIMIT);
  const offset = parsePosInt(searchParams.get('offset'),  0, MAX_OFFSET);

  const facCode = session.role === 'facilitator' ? (session.facCode ?? '') : undefined;

  try {
    const [participants, total] = await Promise.all([
      getParticipants({ limit, offset, facCode }),
      countParticipants({ facCode }),
    ]);

    return NextResponse.json({ participants, total, limit, offset });
  } catch (err: unknown) {
    logSecurity('error', 'api_error', {
      route:   'GET /api/participants',
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'Failed to fetch participants.' }, { status: 500 });
  }
}
