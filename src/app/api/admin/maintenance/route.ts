import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSystemSetting, setSystemSetting, createAuditLog } from '@/lib/db';
import { validateOrigin, logSecurity } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSession();
  if (s?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const maintenance = (await getSystemSetting('maintenance_mode')) === 'true';
  return NextResponse.json({ maintenance });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (s?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-admin-maintenance' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: '`enabled` must be a boolean.' }, { status: 400 });
  }
  const on = body.enabled === true;

  await setSystemSetting('maintenance_mode', String(on));
  await createAuditLog('admin', on ? 'maintenance_enabled' : 'maintenance_disabled');
  return NextResponse.json({ ok: true, maintenance: on });
}
