import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ session: null }, { status: 401 });
  // Never expose facCode or participantId to client — return only display info
  return NextResponse.json({
    session: {
      role:          session.role,
      name:          session.participantName ?? session.facName ?? 'Admin',
      profileUrl:    session.profileUrl,
      // Only included for player sessions — safe to expose since it is the caller's own ID
      participantId: session.role === 'player' ? (session.participantId ?? null) : null,
    }
  });
}
