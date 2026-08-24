import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getFacilitatorMembers, addFacilitatorMember, removeFacilitatorMember, getParticipantByUrl, addParticipant, createAuditLog } from '@/lib/db';
import { validateProfileUrl, sanitizeString, validateUUID, checkRateLimit, getClientIP } from '@/lib/security';
export const dynamic = 'force-dynamic';
async function authFac(req: Request) { const s = await getSession(); return s?.role === 'facilitator' ? s : null; }

export async function GET() {
  const s = await authFac(null as any);
  if (!s) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const members = await getFacilitatorMembers(s.facCode!);
  return NextResponse.json({ members });
}
export async function POST(req: Request) {
  const ip = getClientIP(req);
  if (!checkRateLimit(`fac-add:${ip}`, 20, 60)) return NextResponse.json({ error:'Rate limit.' }, { status:429 });
  const s = await authFac(req);
  if (!s) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  let body: Record<string,unknown>; try { body = await req.json(); } catch { return NextResponse.json({ error:'Invalid body.' }, { status:400 }); }
  const url = sanitizeString(body.profile_url as string ?? '', 2000);
  const v = validateProfileUrl(url); if (!v.ok) return NextResponse.json({ error:v.error }, { status:400 });
  let p = await getParticipantByUrl(url);
  if (!p) p = await addParticipant({ name:'', profile_url:url, role:'participant' });
  await addFacilitatorMember(s.facCode!, p.id, 'manual');
  await createAuditLog(s.facCode!, 'member_added', p.id, { via:'manual' });
  return NextResponse.json({ ok:true, participant:p });
}
export async function DELETE(req: Request) {
  const s = await authFac(req);
  if (!s) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id') ?? '', 50);
  if (!validateUUID(id)) return NextResponse.json({ error:'Invalid ID.' }, { status:400 });
  await removeFacilitatorMember(s.facCode!, id);
  await createAuditLog(s.facCode!, 'member_removed', id);
  return NextResponse.json({ ok:true });
}
