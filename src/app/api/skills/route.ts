import { NextResponse } from 'next/server';
import { getSkillBadges, markClientError } from '@/lib/db';
import { checkRateLimit, getClientIP, logSecurity } from '@/lib/security';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Require an authenticated session.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`skills:${ip}`, 60, 60)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const skills = await getSkillBadges();
    return NextResponse.json({ skills });
  } catch (error: unknown) {
    markClientError();
    logSecurity('error', 'api_error', {
      route:   'GET /api/skills',
      message: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Failed to fetch skill badges.' }, { status: 500 });
  }
}
