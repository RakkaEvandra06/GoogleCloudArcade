import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false, session: null });
  }

  // Never expose facCode or raw participantId beyond what the caller needs.
  return NextResponse.json({
    authenticated: true,
    session: {
      role:          session.role,
      name:          session.participantName ?? session.facName ?? 'Admin',
      profileUrl:    session.profileUrl ?? null,
      // Only included for player sessions — safe because it is the caller's own ID.
      participantId: session.role === 'player' ? (session.participantId ?? null) : null,
    },
  });
}
