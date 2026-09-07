import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getGlobalStats, listFacilitatorCodes, getFacilitatorMemberCount, type Facilitator } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const s = await getSession(); if (s?.role !== 'admin') return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  try {
    const [stats, codes] = await Promise.all([getGlobalStats(), listFacilitatorCodes()]);
    const facilitators = await Promise.all(codes.map(async (c: Facilitator) => ({ ...c, memberCount: await getFacilitatorMemberCount(c.code) })));
    return NextResponse.json({ stats, facilitators });
  } catch (err: unknown) {
    // Log full error server-side (table names, column names, query fragments, etc.)
    // must never reach the client — they accelerate targeted attacks.
    console.error('[admin/stats] db error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}