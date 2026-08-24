import { NextResponse } from 'next/server';
import { getParticipant, updateParticipant, setBadges, deleteParticipant, getBadges } from '@/lib/db';
import { validateUUID, checkRateLimit, getClientIP, logSecurity, validateOrigin } from '@/lib/security';
import { getSession } from '@/lib/session';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

async function resolveId(ctx: Context): Promise<string | null> {
  const { id } = await ctx.params;
  if (!validateUUID(id)) {
    logSecurity('warn', 'invalid_uuid', { route: '/api/participants/[id]', id: '[redacted]' });
    return null;
  }
  return id;
}

export async function GET(_req: Request, ctx: Context) {
  const id = await resolveId(ctx);
  if (!id) return NextResponse.json({ error: 'Invalid participant ID.' }, { status: 400 });
  try {
    const participant = await getParticipant(id);
    if (!participant) return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    const badges = await getBadges(id);
    return NextResponse.json({ participant, badges });
  } catch {
    logSecurity('error', 'api_error', { route: 'GET /api/participants/[id]' });
    return NextResponse.json({ error: 'Failed to fetch participant.' }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: Context) {
  // Must be authenticated (player syncing own profile, or facilitator, or admin)
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const id = await resolveId(ctx);
  if (!id) return NextResponse.json({ error: 'Invalid participant ID.' }, { status: 400 });

  // Players can only sync themselves
  if (session.role === 'player' && session.participantId !== id)
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  // CSRF protection on sync (state-changing)
  if (!validateOrigin(request)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-on-sync' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const ip = getClientIP(request);
  if (!checkRateLimit(`sync:${id}:${ip}`, 5, 60))
    return NextResponse.json({ error: 'Sync rate limit exceeded. Please wait.' }, { status: 429 });

  try {
    const participant = await getParticipant(id);
    if (!participant) return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });

    const baseUrl = new URL(request.url).origin;
    const scrapeRes = await fetch(
      `${baseUrl}/api/scrape?url=${encodeURIComponent(participant.profile_url)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(30_000) },
    );

    if (!scrapeRes.ok) {
      const errData = await scrapeRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (errData as Record<string, string>).error ?? 'Scrape failed.' },
        { status: scrapeRes.status },
      );
    }

    const scrapeData = await scrapeRes.json();
    await setBadges(id, scrapeData.badges ?? []);
    const updated = await updateParticipant(id, {
      name:        scrapeData.name       || participant.name,
      avatar_url:  scrapeData.avatar_url || participant.avatar_url,
      last_synced: scrapeData.scraped_at,
    });

    const badges = await getBadges(id);
    return NextResponse.json({ success: true, participant: updated ?? participant, badges });
  } catch {
    logSecurity('error', 'api_error', { route: 'POST /api/participants/[id]' });
    return NextResponse.json({ error: 'Failed to sync participant.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Context) {
  // Only admin/facilitator can delete
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'facilitator'))
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // CSRF
  if (!validateOrigin(request)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-on-delete' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const id = await resolveId(ctx);
  if (!id) return NextResponse.json({ error: 'Invalid participant ID.' }, { status: 400 });

  try {
    const deleted = await deleteParticipant(id);
    if (!deleted) return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    logSecurity('error', 'api_error', { route: 'DELETE /api/participants/[id]' });
    return NextResponse.json({ error: 'Failed to delete participant.' }, { status: 500 });
  }
}
