import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createFeedback, getFeedbackList } from '@/lib/db';
import { sanitizeString, checkRateLimit, getClientIP } from '@/lib/security';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const ip = getClientIP(req);
  if (!checkRateLimit(`feedback:${ip}`, 3, 3600)) return NextResponse.json({ error:'Rate limit.' }, { status:429 });
  let body: Record<string,unknown>; try { body = await req.json(); } catch { return NextResponse.json({ error:'Invalid body.' }, { status:400 }); }
  const message = sanitizeString(body.message as string ?? '', 2000);
  const category = sanitizeString(body.category as string ?? 'general', 50);
  const rating = typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5 ? body.rating : null;
  if (!message || message.length < 5) return NextResponse.json({ error:'Message too short.' }, { status:400 });
  await createFeedback(message, rating, category);
  return NextResponse.json({ ok:true });
}
export async function GET() {
  const s = await getSession(); if (s?.role !== 'admin') return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  return NextResponse.json({ feedback: await getFeedbackList(100) });
}
