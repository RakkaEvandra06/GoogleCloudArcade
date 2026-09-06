import { NextResponse } from 'next/server';
import { getSkillBadges } from '@/lib/db';

export async function GET() {
  try {
    const skills = await getSkillBadges();
    return NextResponse.json({ skills });
  } catch (error: unknown) {
    console.error('[skills] fetch error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Gagal mengambil data skill.' }, { status: 500 });
  }
}
