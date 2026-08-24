import { NextResponse } from 'next/server';
import {
  getParticipants,
  getParticipantByUrl,
  addParticipant,
  updateParticipant,
  setBadges,
} from '@/lib/db';
import {
  validateParticipantInput,
  checkRateLimit,
  getClientIP,
  logSecurity,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const participants = await getParticipants();
    return NextResponse.json({ participants });
  } catch (err) {
    logSecurity('error', 'api_error', { route: 'GET /api/participants' });
    return NextResponse.json({ error: 'Failed to fetch participants.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // ── Rate limit: 10 registrations per IP per 10 minutes ────────────────────
  const ip = getClientIP(request);
  if (!checkRateLimit(`register:${ip}`, 10, 600)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes.' },
      { status: 429 },
    );
  }

  // ── Parse & validate body ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validation = validateParticipantInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { profile_url, role } = validation;

  // Normalise cloudskillsboost → www.skills.google (the canonical host)
  const targetUrl = profile_url!
    .replace(
      /^https?:\/\/(www\.)?cloudskillsboost\.google\.com\/public_profiles\//,
      'https://www.skills.google/public_profiles/',
    )
    .replace(
      /^https?:\/\/skills\.google\/public_profiles\//,
      'https://www.skills.google/public_profiles/',
    );

  try {
    // ── Returning user ──────────────────────────────────────────────────────
    const existing = await getParticipantByUrl(targetUrl);
    if (existing) {
      return NextResponse.json({ participant: existing, returning: true });
    }

    // ── New user: persist, then auto-scrape ────────────────────────────────
    const newP = await addParticipant({
      name: '',
      profile_url: targetUrl,
      role: role ?? 'participant',
    });

    try {
      const baseUrl = new URL(request.url).origin;
      const scrapeRes = await fetch(
        `${baseUrl}/api/scrape?url=${encodeURIComponent(targetUrl)}`,
        { cache: 'no-store', signal: AbortSignal.timeout(25_000) },
      );
      if (scrapeRes.ok) {
        const data = await scrapeRes.json();
        await setBadges(newP.id, data.badges ?? []);
        const updated = await updateParticipant(newP.id, {
          name:        data.name       || newP.name,
          avatar_url:  data.avatar_url || newP.avatar_url,
          last_synced: data.scraped_at,
        });
        return NextResponse.json({ participant: updated ?? newP, returning: false });
      }
    } catch {
      logSecurity('warn', 'sync_error', { step: 'auto_scrape_on_register' });
    }

    return NextResponse.json({ participant: newP, returning: false });
  } catch (err) {
    logSecurity('error', 'api_error', { route: 'POST /api/participants' });
    return NextResponse.json({ error: 'Failed to register participant.' }, { status: 500 });
  }
}
