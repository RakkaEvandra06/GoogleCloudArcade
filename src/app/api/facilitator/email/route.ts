import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getParticipant, getBadges } from '@/lib/db';
import {
  sanitizeString,
  checkRateLimit,
  getClientIP,
  validateUUID,
  requireJsonContentType,
  validateOrigin,
  escapeHtml,
  logSecurity,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

const ACTIVE = '2026-07-01';

const MAX_EMAIL_BATCH = 200;

function isValidEmail(email: string): boolean {
  if (!email) return false;
  if (email.includes('placeholder')) return false;
  return /^[^\s@]+@[^\s@]{1,63}\.[^\s@]{2,}$/.test(email);
}

function emailHtml(
  name: string,
  pts: number,
  games: number,
  skills: number,
  m1: boolean,
  m2: boolean,
  m3: boolean,
): string {
  const tier = pts >= 120 ? '🏆 Legend'
             : pts >= 95  ? '👑 Champion'
             : pts >= 75  ? '🎯 Ranger'
             : pts >= 50  ? '🛡️ Trooper'
             :              'Unranked';
  const ms = m3 ? 'Ultimate ✓' : m2 ? 'Milestone 2 ✓' : m1 ? 'Milestone 1 ✓' : 'No milestone yet';

  // Escape all user/externally-sourced values before HTML interpolation
  const safeName = escapeHtml(name);
  const safeTier = escapeHtml(tier);
  const safeMs   = escapeHtml(ms);

  return `<!DOCTYPE html><body style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f0f4f8;padding:24px"><div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0"><h2 style="color:#4285f4">🎮 Arcade 2026 — Progress Report</h2><p>Hi <strong>${safeName}</strong>!</p><table style="width:100%"><tr><td><b>Points</b></td><td style="text-align:right;color:#4285f4;font-weight:bold">${pts.toFixed(1)}</td></tr><tr><td><b>Games</b></td><td style="text-align:right">${games}</td></tr><tr><td><b>Skills</b></td><td style="text-align:right">${skills}</td></tr><tr><td><b>Tier</b></td><td style="text-align:right">${safeTier}</td></tr><tr><td><b>Milestone</b></td><td style="text-align:right;color:#34a853">${safeMs}</td></tr></table></div></body>`;
}

export async function POST(req: Request) {
  const ip = getClientIP(req);

  // ── Rate limit ────────────────────────────────────────────────────────────
  if (!checkRateLimit(`fac-email:${ip}`, 2, 300))
    return NextResponse.json({ error: 'Rate limit.' }, { status: 429 });

  // ── Content-Type guard ────────────────────────────────────────────────────
  if (!requireJsonContentType(req))
    return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 });

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-fac-email' });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // ── Authentication ────────────────────────────────────────────────────────
  const s = await getSession();
  if (s?.role !== 'facilitator')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key  = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL ?? 'noreply@arcadetrack.app';
  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY not configured.' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  if (!Array.isArray(body.member_ids))
    return NextResponse.json({ error: 'member_ids must be an array.' }, { status: 400 });

  // Cap at MAX_EMAIL_BATCH to prevent runaway serverless execution
  const ids     = (body.member_ids as unknown[]).slice(0, MAX_EMAIL_BATCH).map(String);
  const subject = sanitizeString(body.subject as string ?? 'Your Arcade 2026 Progress', 200);
  const overrideEmail = sanitizeString(body.override_email as string ?? '', 200);

  let sent = 0, failed = 0, skipped = 0;

  for (const id of ids) {
    if (!validateUUID(id)) continue;

    try {
      const p = await getParticipant(id);
      if (!p) continue;

      const recipientEmail = overrideEmail || (p as unknown as Record<string, unknown>).email as string | undefined;
      if (!recipientEmail || !isValidEmail(recipientEmail)) { skipped++; continue; }

      const badges = await getBadges(id);
      type B = (typeof badges)[number];
      const m      = badges.filter((b: B) => b.earned_date >= ACTIVE);
      const games  = m.filter((b: B) => b.category === 'game').length;
      const skills = m.filter((b: B) => b.category === 'skill_badge').length;
      const pts    = p.monthly_points ?? 0;
      const m1 = games >= 1  && skills >= 7;
      const m2 = games >= 3  && skills >= 14;
      const m3 = games >= 8  && skills >= 28;

      const r = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from,
          to:      [recipientEmail],
          subject,
          html:    emailHtml(p.name || 'Learner', pts, games, skills, m1, m2, m3),
        }),
      });
      if (r.ok) { sent++; } else { failed++; }
    } catch { failed++; }

    await new Promise<void>(r => setTimeout(r, 300));
  }

  return NextResponse.json({ ok: true, sent, failed, skipped });
}
