import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUploadBatches, rollbackBatch, createAuditLog } from '@/lib/db';
import { sanitizeString, validateUUID, checkRateLimit, getClientIP, validateOrigin, logSecurity } from '@/lib/security';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'facilitator') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ip = getClientIP(req);
  if (!checkRateLimit(`batches-get:${ip}`, 30, 60)) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  const batches = await getUploadBatches(s.facCode!);
  return NextResponse.json({ batches });
}

export async function DELETE(req: Request) {
  const s = await getSession();
  if (!s || s.role !== 'facilitator') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // CSRF protection on state-changing DELETE
  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-on-rollback' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`rollback:${s.facCode}:${ip}`, 5, 60)) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id') ?? '', 50);
  if (!validateUUID(id)) return NextResponse.json({ error: 'Invalid batch ID.' }, { status: 400 });

  const ok = await rollbackBatch(id, s.facCode!);
  if (ok) await createAuditLog(s.facCode!, 'batch_rollback', id);
  return NextResponse.json({ ok });
}
