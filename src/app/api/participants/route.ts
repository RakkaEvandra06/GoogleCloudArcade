import { NextResponse } from 'next/server';
import { getParticipants } from '@/lib/db';

export const dynamic = 'force-dynamic';
export async function GET(_req: Request) {
  try {
    const participants = await getParticipants();
    return NextResponse.json({ participants });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch participants.' },
      { status: 500 },
    );
  }
}
