import { NextResponse } from 'next/server';
import { getFacilitatorByCode, getParticipantByUrl, addParticipant, setBadges, updateParticipant } from '@/lib/db';
import { validateProfileUrl, checkRateLimit, getClientIP, sanitizeString, safeCompare, requireJsonContentType, validateOrigin, logSecurity } from '@/lib/security';
import { writeSessionCookie } from '@/lib/session';
import type { ArcadeSession } from '@/lib/session';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIP(req);

  if (!requireJsonContentType(req))
    return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 });

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-origin-mismatch', ip });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (!checkRateLimit(`auth:${ip}`, 10, 60))
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const type = sanitizeString(body.type as string ?? '', 20);

  // ── PLAYER ────────────────────────────────────────────────────────────────
  if (type === 'player') {
    const rawUrl = sanitizeString(body.profile_url as string ?? '', 2000);
    const v = validateProfileUrl(rawUrl);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const url = rawUrl
      .replace(/^https?:\/\/(www\.)?cloudskillsboost\.google\.com\/public_profiles\//, 'https://www.skills.google/public_profiles/')
      .replace(/^https?:\/\/skills\.google\/public_profiles\//, 'https://www.skills.google/public_profiles/');

    try {
      // ── Look up or create the participant ────────────────────────────────
      let p = await getParticipantByUrl(url);
      if (!p) {
        p = await addParticipant({ name: '', profile_url: url, role: 'participant' });

        // ── Scrape + badge enrichment (non-fatal) ────────────────────────────
        try {
          const base = new URL(req.url).origin;
          const s = await fetch(
            `${base}/api/scrape?url=${encodeURIComponent(url)}`,
            { cache: 'no-store', signal: AbortSignal.timeout(25_000) },
          );
          if (s.ok) {
            const d = await s.json();
            await setBadges(p.id, d.badges ?? []);
            await updateParticipant(p.id, {
              name:        d.name || '',
              avatar_url:  d.avatar_url,
              last_synced: d.scraped_at,
            });
            // Reload the participant so the session includes the real name
            p = (await getParticipantByUrl(url)) ?? p;
          }
        } catch (enrichErr: unknown) {
          // Log for server-side diagnosis but do NOT propagate to the client.
          // The login will succeed with the placeholder profile name.
          console.warn(
            '[login/player] scrape enrichment failed (non-fatal):',
            enrichErr instanceof Error ? enrichErr.message : enrichErr,
          );
        }
      }

      const session: Omit<ArcadeSession, 'createdAt'> = {
        role:            'player',
        participantId:   p.id,
        participantName: p.name,
        profileUrl:      url,
      };
      const res = NextResponse.json({ ok: true, role: 'player', name: p.name, participantId: p.id });
      return writeSessionCookie(res, session);

    } catch (err: unknown) {
      // This outer catch now only triggers for genuine DB failures in
      // getParticipantByUrl() or addParticipant(), not for scrape errors.
      console.error(
        '[login/player] fatal DB error:',
        err instanceof Error ? err.message : err,
      );
      return NextResponse.json({ error: 'Failed to register profile. Please try again.' }, { status: 500 });
    }
  }

  // ── FACILITATOR ───────────────────────────────────────────────────────────
  if (type === 'facilitator') {
    const code = sanitizeString(body.code as string ?? '', 50).toUpperCase();
    if (!code) return NextResponse.json({ error: 'Access code required.' }, { status: 400 });
    try {
      const fac = await getFacilitatorByCode(code);
      if (!fac) return NextResponse.json({ error: 'Invalid or inactive access code.' }, { status: 401 });
      const session: Omit<ArcadeSession, 'createdAt'> = { role: 'facilitator', facCode: fac.code, facName: fac.name };
      const res = NextResponse.json({ ok: true, role: 'facilitator', name: fac.name });
      return writeSessionCookie(res, session);
    } catch (err: unknown) {
      console.error('[login/facilitator] DB error:', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
    }
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  if (type === 'admin') {
    const secret      = sanitizeString(body.secret as string ?? '', 200);
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || !safeCompare(secret, adminSecret))
      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    const session: Omit<ArcadeSession, 'createdAt'> = { role: 'admin' };
    const res = NextResponse.json({ ok: true, role: 'admin' });
    return writeSessionCookie(res, session);
  }

  return NextResponse.json({ error: 'Invalid login type.' }, { status: 400 });
}
