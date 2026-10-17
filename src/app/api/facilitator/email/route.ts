/**
 * POST /api/facilitator/email
 *
 * Send a progress-report email to selected participants.
 *
 * Refactored per audit (September 2026):
 *   H-1 FIX — IDOR: Added membership verification before sending each email.
 *             Previously any facilitator could supply arbitrary participant UUIDs
 *             (including those belonging to other facilitators' cohorts) and the
 *             system would send them an email without any ownership check.
 *             Fix: fetch the facilitator's member ID set upfront; any UUID not
 *             in that set is silently skipped and counted as `skipped`.
 *
 *   M-2 FIX — override_email is now restricted to the authenticated facilitator's
 *             own stored email. Previously any valid email address was accepted,
 *             enabling a facilitator to send platform-branded email to arbitrary
 *             external addresses (spam / phishing vector).
 *
 *   M-4 FIX — req.json() replaced with readBoundedJson() (1 MiB cap).
 *
 *   M-5 FIX — Point calculation uses calcPointsFromBadges() from scoring.ts
 *             instead of an inline formula.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getParticipant, getBadges, getFacilitatorMembers } from '@/lib/db';
import {
  sanitizeString,
  checkRateLimit,
  getClientIP,
  validateUUID,
  validateOrigin,
  escapeHtml,
  isValidEmail,
  logSecurity,
  readBoundedJson,
} from '@/lib/security';
import { achievedMilestone } from '@/lib/milestones';
import { calcPointsFromBadges, ACTIVE_PERIOD_START } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

/**
 * Builds the HTML body for a progress-report email.
 * All user-derived strings are passed through escapeHtml() before
 * interpolation to prevent XSS in email clients that render HTML.
 */
function buildEmailHtml(
  rawName:  string,
  pts:      number,
  games:    number,
  skills:   number,
  msLabel:  string,
): string {
  const name      = escapeHtml(rawName || 'Learner');
  const milestone = escapeHtml(msLabel);
  const tier =
    pts >= 120 ? '🏆 Legend'  :
    pts >= 95  ? '👑 Champion' :
    pts >= 75  ? '🎯 Ranger'   :
    pts >= 50  ? '🛡️ Trooper'  :
    'Unranked';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Arcade 2026 Progress Report</title></head>
<body style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f0f4f8;padding:24px">
  <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
    <h2 style="color:#4285f4">🎮 Arcade 2026 — Progress Report</h2>
    <p>Hi <strong>${name}</strong>!</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td><b>Points</b></td>
          <td style="text-align:right;color:#4285f4;font-weight:bold">${pts.toFixed(1)}</td></tr>
      <tr><td><b>Games</b></td>
          <td style="text-align:right">${games}</td></tr>
      <tr><td><b>Skills</b></td>
          <td style="text-align:right">${skills}</td></tr>
      <tr><td><b>Tier</b></td>
          <td style="text-align:right">${tier}</td></tr>
      <tr><td><b>Milestone</b></td>
          <td style="text-align:right;color:#34a853">${milestone}</td></tr>
    </table>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  const ip = getClientIP(req);

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-fac-email', ip });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (!checkRateLimit(`fac-email:${ip}`, 2, 300)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 });
  }

  const s = await getSession();
  if (s?.role !== 'facilitator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const key  = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL ?? 'noreply@arcadetrack.app';
  if (!key) {
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 });
  }

  // M-4 FIX: bounded JSON reader instead of bare req.json()
  const body = await readBoundedJson(req);
  if (!body) {
    return NextResponse.json({ error: 'Invalid or oversized JSON body.' }, { status: 400 });
  }

  const ids     = Array.isArray(body.member_ids) ? (body.member_ids as unknown[]) : [];
  const subject = sanitizeString((body.subject as string) ?? 'Your Arcade 2026 Progress', 200);

  // M-2 FIX: override_email must match the facilitator's own account email.
  // A facilitator's stored email is in s.email (set at facilitator login from
  // the facilitator_codes row).  If the session has no email, override_email
  // is not permitted — the participant's own email address must be used instead.
  const rawOverride   = sanitizeString((body.override_email as string) ?? '', 254);
  let   overrideEmail = '';

  if (rawOverride) {
    if (!isValidEmail(rawOverride)) {
      return NextResponse.json(
        { error: 'override_email is not a valid email address.' },
        { status: 400 },
      );
    }
    // Restrict to the facilitator's own email address to prevent outbound spam.
    const facEmail = (s as { email?: string }).email ?? '';
    if (!facEmail || rawOverride.toLowerCase() !== facEmail.toLowerCase()) {
      logSecurity('warn', 'invalid_input', {
        route:        'POST /api/facilitator/email',
        reason:       'override_email_not_own',
        facCode:      s.facCode,
        attempted:    rawOverride.slice(0, 30),
      });
      return NextResponse.json(
        { error: 'override_email must match your own facilitator account email.' },
        { status: 403 },
      );
    }
    overrideEmail = rawOverride;
  }

  // H-1 FIX: Load the authenticated facilitator's member IDs once upfront.
  // Any participant UUID NOT in this set is rejected before sending.
  let memberSet: Set<string>;
  try {
    const members = await getFacilitatorMembers(s.facCode!);
    memberSet = new Set(members.map(m => m.id));
  } catch {
    logSecurity('error', 'api_error', {
      route:   'POST /api/facilitator/email',
      step:    'fetch-member-ids',
      facCode: s.facCode,
    });
    return NextResponse.json(
      { error: 'Failed to verify group membership. Please try again.' },
      { status: 500 },
    );
  }

  let sent = 0, failed = 0, skipped = 0;

  for (const rawId of ids) {
    const id = typeof rawId === 'string' ? rawId : '';
    if (!validateUUID(id)) { skipped++; continue; }

    // H-1 FIX: Membership gate — silently skip IDs outside this facilitator's group.
    if (!memberSet.has(id)) {
      logSecurity('warn', 'idor_attempt', {
        route:    'POST /api/facilitator/email',
        facCode:  s.facCode,
        targetId: id,
      });
      skipped++;
      continue;
    }

    try {
      const p = await getParticipant(id);
      if (!p) { skipped++; continue; }

      const recipientEmail = overrideEmail || p.email;
      if (!recipientEmail || !isValidEmail(recipientEmail)) {
        skipped++;
        continue;
      }

      const badges = await getBadges(id);
      // M-5 FIX: calcPointsFromBadges() from scoring.ts instead of inline formula.
      const active = badges.filter(b => b.earned_date >= ACTIVE_PERIOD_START);
      const gCount = active.filter(b => b.category === 'game').length;
      const sCount = active.filter(b => b.category === 'skill_badge').length;
      const pts    = calcPointsFromBadges(badges, ACTIVE_PERIOD_START);

      const achieved = achievedMilestone(gCount, sCount);
      const msLabel  = achieved ? `${achieved.label} ✓` : 'No milestone yet';

      const html = buildEmailHtml(p.name ?? '', pts, gCount, sCount, msLabel);

      const r = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ from, to: [recipientEmail], subject, html }),
      });

      if (r.ok) {
        sent++;
      } else {
        failed++;
        logSecurity('warn', 'api_error', {
          route:  'POST /api/facilitator/email',
          step:   'send',
          status: r.status,
        });
      }
    } catch {
      failed++;
      logSecurity('warn', 'api_error', { route: 'POST /api/facilitator/email', step: 'send' });
    }

    // Small delay to avoid overwhelming Resend.
    await new Promise<void>(r => setTimeout(r, 300));
  }

  return NextResponse.json({ ok: true, sent, failed, skipped });
}
