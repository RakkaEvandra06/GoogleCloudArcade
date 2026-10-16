import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  getFacilitatorMembers,
  addFacilitatorMember,
  removeFacilitatorMember,
  getParticipantByUrl,
  addParticipant,
  createAuditLog,
} from '@/lib/db';
import {
  validateProfileUrl,
  sanitizeString,
  validateUUID,
  checkRateLimit,
  getClientIP,
  validateOrigin,
  logSecurity,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

async function authFacilitator() {
  const s = await getSession();
  return s?.role === 'facilitator' ? s : null;
}

export async function GET() {
  const s = await authFacilitator();
  if (!s) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const members = await getFacilitatorMembers(s.facCode!);
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-fac-members-post', ip: getClientIP(req) });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(`fac-add:${ip}`, 20, 60)) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const s = await authFacilitator();
  if (!s) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const url = sanitizeString((body.profile_url as string) ?? '', 2_000);
  const v   = validateProfileUrl(url);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
    let p = await getParticipantByUrl(url);
    if (!p) p = await addParticipant({ name: '', profile_url: url, role: 'participant' });
    await addFacilitatorMember(s.facCode!, p.id, 'manual');
    await createAuditLog(s.facCode!, 'member_added', p.id, { via: 'manual' });
    return NextResponse.json({ ok: true, participant: p });
  } catch {
    logSecurity('error', 'api_error', { route: 'POST /api/facilitator/members' });
    return NextResponse.json({ error: 'Failed to add member.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // CSRF protection: DELETE requests carry no body in most frameworks, but we
  // still validate the Origin header as a defence-in-depth measure.
  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-fac-members-delete' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const s = await authFacilitator();
  if (!s) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id') ?? '', 50);
  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid participant ID.' }, { status: 400 });
  }

  try {
    await removeFacilitatorMember(s.facCode!, id);
    await createAuditLog(s.facCode!, 'member_removed', id);
    return NextResponse.json({ ok: true });
  } catch {
    logSecurity('error', 'api_error', { route: 'DELETE /api/facilitator/members' });
    return NextResponse.json({ error: 'Failed to remove member.' }, { status: 500 });
  }
}
