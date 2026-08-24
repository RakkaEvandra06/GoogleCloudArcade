import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSystemSetting, setSystemSetting, createAuditLog } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const s = await getSession(); if (s?.role !== 'admin') return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  return NextResponse.json({ maintenance: (await getSystemSetting('maintenance_mode')) === 'true' });
}
export async function POST(req: Request) {
  const s = await getSession(); if (s?.role !== 'admin') return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  let body: Record<string,unknown>; try { body = await req.json(); } catch { return NextResponse.json({ error:'Invalid body.' }, { status:400 }); }
  const on = body.enabled === true;
  await setSystemSetting('maintenance_mode', String(on));
  await createAuditLog('admin', on ? 'maintenance_enabled' : 'maintenance_disabled');
  return NextResponse.json({ ok:true, maintenance:on });
}
