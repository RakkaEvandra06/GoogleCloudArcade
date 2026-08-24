import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';
import { checkRateLimit, getClientIP } from '@/lib/security';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  // Rate-limit: prevent logout-flood / session-invalidation DoS
  const ip = getClientIP(req);
  if (!checkRateLimit(`logout:${ip}`, 20, 60))
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  const res = NextResponse.json({ ok: true });
  return clearSessionCookie(res);
}
