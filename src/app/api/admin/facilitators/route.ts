import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  createFacilitatorCode,
  listFacilitatorCodes,
  getFacilitatorMemberCount,
} from '@/lib/db';
import { sanitizeString, validateOrigin, logSecurity } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSession();
  if (s?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const codes = await listFacilitatorCodes();
  const list  = await Promise.all(
    codes.map(async c => ({ ...c, memberCount: await getFacilitatorMemberCount(c.code) })),
  );
  return NextResponse.json({ facilitators: list });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (s?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-admin-facilitators' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const name = sanitizeString((body.name as string) ?? '', 100);
  const code = sanitizeString((body.code as string) ?? '', 50).toUpperCase();

  if (!name || !code) {
    return NextResponse.json({ error: 'Name and code are required.' }, { status: 400 });
  }

  // Enforce a strict alphanumeric code format to prevent injection in downstream usage.
  if (!/^[A-Z0-9\-]{4,30}$/.test(code)) {
    return NextResponse.json(
      { error: 'Code must be 4–30 characters: uppercase letters, digits, and hyphens only.' },
      { status: 400 },
    );
  }

  const fac = await createFacilitatorCode(name, code);
  if (!fac) {
    return NextResponse.json({ error: 'Code already exists or creation failed.' }, { status: 409 });
  }
  return NextResponse.json({ ok: true, facilitator: fac });
}
