import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAuditLogs } from '@/lib/db';
import { checkRateLimit, getClientIP } from '@/lib/security';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ip = getClientIP(req);
  if (!checkRateLimit(`audit-logs:${ip}`, 20, 60)) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')  ?? '50')));
  const offset = Math.max(0,              parseInt(searchParams.get('offset') ?? '0'));
  return NextResponse.json({ logs: await getAuditLogs(limit, offset) });
}
