import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getGlobalStats, listFacilitatorCodes, getFacilitatorMemberCount, type Facilitator } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const s = await getSession(); if (s?.role !== 'admin') return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const [stats, codes] = await Promise.all([getGlobalStats(), listFacilitatorCodes()]);
  const facilitators = await Promise.all(codes.map(async (c: Facilitator) => ({ ...c, memberCount: await getFacilitatorMemberCount(c.code) })));
  return NextResponse.json({ stats, facilitators });
}