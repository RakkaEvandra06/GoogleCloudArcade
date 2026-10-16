import { NextResponse } from 'next/server';
import {
  getFacilitatorByCode,
  getParticipantByUrl,
  addParticipant,
  setBadges,
  updateParticipant,
} from '@/lib/db';
import {
  validateProfileUrl,
  checkRateLimit,
  getClientIP,
  sanitizeString,
  safeCompare,
  requireJsonContentType,
  validateOrigin,
  logSecurity,
} from '@/lib/security';
import { writeSessionCookie } from '@/lib/session';
import type { ArcadeSession } from '@/lib/session';
import { scrapeProfile, ScrapeError } from '@/lib/scrapeProfile';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIP(req);

  if (!requireJsonContentType(req)) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json.' },
      { status: 415 },
    );
  }

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-login', ip });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (!checkRateLimit(`auth:${ip}`, 10, 60)) {
    return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const type = sanitizeString(body.type as string ?? '', 20);

  // ── PLAYER ────────────────────────────────────────────────────────────────
  if (type === 'player') {
    const rawUrl = sanitizeString(body.profile_url as string ?? '', 2_000);
    const v = validateProfileUrl(rawUrl);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    // Normalise to canonical skills.google form.
    const url = rawUrl
      .replace(
        /^https?:\/\/(www\.)?cloudskillsboost\.google\.com\/public_profiles\//,
        'https://www.skills.google/public_profiles/',
      )
      .replace(
        /^https?:\/\/skills\.google\/public_profiles\//,
        'https://www.skills.google/public_profiles/',
      );

    try {
      let p = await getParticipantByUrl(url);
      if (!p) {
        p = await addParticipant({ name: '', profile_url: url, role: 'participant' });
        // Call scrapeProfile() directly instead of fetching /api/scrape.
        try {
          const data = await scrapeProfile(url);
          await setBadges(p.id, data.badges);
          await updateParticipant(p.id, {
            name:        data.name || '',
            avatar_url:  data.avatar_url,
            last_synced: data.scraped_at,
          });
          p = (await getParticipantByUrl(url)) ?? p;
        } catch (scrapeErr) {
          // Non-fatal on first login — the participant record exists, they can
          // sync badges manually from the dashboard.
          if (scrapeErr instanceof ScrapeError && scrapeErr.statusCode === 404) {
            return NextResponse.json({ error: scrapeErr.message }, { status: 404 });
          }
          logSecurity('warn', 'api_error', { route: 'POST /api/auth/login', step: 'initial-scrape' });
        }
      }

      const session: Omit<ArcadeSession, 'createdAt'> = {
        role:            'player',
        participantId:   p.id,
        participantName: p.name,
        profileUrl:      url,
      };
      const res = NextResponse.json({
        ok:            true,
        role:          'player',
        name:          p.name,
        participantId: p.id,
      });
      return writeSessionCookie(res, session);
    } catch {
      return NextResponse.json({ error: 'Failed to register profile.' }, { status: 500 });
    }
  }

  // ── FACILITATOR ───────────────────────────────────────────────────────────
  if (type === 'facilitator') {
    const code = sanitizeString(body.code as string ?? '', 50).toUpperCase();
    if (!code) return NextResponse.json({ error: 'Access code required.' }, { status: 400 });
    const fac = await getFacilitatorByCode(code);
    if (!fac) {
      return NextResponse.json({ error: 'Invalid or inactive access code.' }, { status: 401 });
    }
    const session: Omit<ArcadeSession, 'createdAt'> = {
      role:    'facilitator',
      facCode: fac.code,
      facName: fac.name,
    };
    const res = NextResponse.json({ ok: true, role: 'facilitator', name: fac.name });
    return writeSessionCookie(res, session);
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  if (type === 'admin') {
    const secret      = sanitizeString(body.secret as string ?? '', 200);
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || !safeCompare(secret, adminSecret)) {
      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    }
    const session: Omit<ArcadeSession, 'createdAt'> = { role: 'admin' };
    const res = NextResponse.json({ ok: true, role: 'admin' });
    return writeSessionCookie(res, session);
  }

  return NextResponse.json({ error: 'Invalid login type.' }, { status: 400 });
}
