import { NextResponse } from 'next/server';
import {
  getParticipant,
  updateParticipant,
  setBadges,
  deleteParticipant,
  getBadges,
  getFacilitatorMembers,
  createAuditLog,
} from '@/lib/db';
import {
  validateUUID,
  checkRateLimit,
  getClientIP,
  logSecurity,
  validateOrigin,
} from '@/lib/security';
import { getSession } from '@/lib/session';
import { scrapeProfile, ScrapeError } from '@/lib/scrapeProfile';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

async function resolveId(ctx: Context): Promise<string | null> {
  const { id } = await ctx.params;
  if (!validateUUID(id)) {
    logSecurity('warn', 'invalid_uuid', {
      route: '/api/participants/[id]',
      id:    '[redacted]',
    });
    return null;
  }
  return id;
}

export async function GET(_req: Request, ctx: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const id = await resolveId(ctx);
  if (!id) return NextResponse.json({ error: 'Invalid participant ID.' }, { status: 400 });

  // Players may only read their own record.
  if (session.role === 'player' && session.participantId !== id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  try {
    const participant = await getParticipant(id);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    }
    const badges = await getBadges(id);
    return NextResponse.json({ participant, badges });
  } catch {
    logSecurity('error', 'api_error', { route: 'GET /api/participants/[id]' });
    return NextResponse.json({ error: 'Failed to fetch participant.' }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const id = await resolveId(ctx);
  if (!id) return NextResponse.json({ error: 'Invalid participant ID.' }, { status: 400 });

  if (session.role === 'player' && session.participantId !== id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (!validateOrigin(request)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-on-sync' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const ip = getClientIP(request);
  if (!checkRateLimit(`sync:${ip}:${id}`, 5, 60)) {
    return NextResponse.json(
      { error: 'Sync rate limit exceeded. Please wait.' },
      { status: 429 },
    );
  }

  try {
    const participant = await getParticipant(id);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    }

    const data = await scrapeProfile(participant.profile_url);

    await setBadges(id, data.badges);
    const updated = await updateParticipant(id, {
      name:        data.name        || participant.name,
      avatar_url:  data.avatar_url  || participant.avatar_url,
      last_synced: data.scraped_at,
    });

    const badges = await getBadges(id);
    return NextResponse.json({ success: true, participant: updated ?? participant, badges });
  } catch (err) {
    if (err instanceof ScrapeError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    logSecurity('error', 'api_error', { route: 'POST /api/participants/[id]' });
    return NextResponse.json({ error: 'Failed to sync participant.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Context) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'facilitator')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!validateOrigin(request)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-on-delete' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const id = await resolveId(ctx);
  if (!id) return NextResponse.json({ error: 'Invalid participant ID.' }, { status: 400 });

  // Facilitators may only delete participants who are members of their own group.
  // Admins bypass this check and can delete any participant.
  if (session.role === 'facilitator') {
    try {
      const members    = await getFacilitatorMembers(session.facCode!);
      const isMember   = members.some(m => m.id === id);
      if (!isMember) {
        logSecurity('warn', 'idor_attempt', {
          route:   'DELETE /api/participants/[id]',
          facCode: session.facCode,
          targetId: id,
        });
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    } catch {
      logSecurity('error', 'api_error', {
        route: 'DELETE /api/participants/[id]',
        step:  'membership-check',
      });
      return NextResponse.json({ error: 'Failed to verify membership.' }, { status: 500 });
    }
  }

  try {
    const deleted = await deleteParticipant(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    }
    await createAuditLog(
      session.facCode ?? 'admin',
      'participant_deleted',
      id,
    );
    return NextResponse.json({ success: true });
  } catch {
    logSecurity('error', 'api_error', { route: 'DELETE /api/participants/[id]' });
    return NextResponse.json({ error: 'Failed to delete participant.' }, { status: 500 });
  }
}
