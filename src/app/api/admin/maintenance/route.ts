import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSystemSetting, setSystemSetting, createAuditLog } from '@/lib/db';
import {
  requireJsonContentType,
  validateOrigin,
  logSecurity,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

// GET — read-only, no CSRF guard needed.
export async function GET() {
  const s = await getSession();
  if (s?.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ maintenance: (await getSystemSetting('maintenance_mode')) === 'true' });
}

export async function POST(req: Request) {
  // Content-Type guard
  if (!requireJsonContentType(req))
    return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 });

  // CSRF / origin guard
  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-admin-maintenance' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const s = await getSession();
  if (s?.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  // Strict boolean check — rejects strings like "false" which would coerce to
  // true and silently enable maintenance mode.
  if (typeof body.enabled !== 'boolean')
    return NextResponse.json({ error: '`enabled` must be a boolean.' }, { status: 400 });

  const on = body.enabled;
  await setSystemSetting('maintenance_mode', String(on));
  await createAuditLog('admin', on ? 'maintenance_enabled' : 'maintenance_disabled');
  return NextResponse.json({ ok: true, maintenance: on });
}
