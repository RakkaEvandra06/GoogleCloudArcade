import { NextResponse } from 'next/server';
import { getSkillBadges } from '@/lib/db';
import { checkRateLimit, getClientIP } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ip = getClientIP(req);

  if (!checkRateLimit(`skills:${ip}`, 60, 60)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const skills = await getSkillBadges();
    return NextResponse.json({ skills });
  } catch (error: unknown) {
    console.error('[skills] fetch error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Gagal mengambil data skill.' }, { status: 500 });
  }
}
