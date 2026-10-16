import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  getParticipantByUrl,
  addParticipant,
  addFacilitatorMember,
  createUploadBatch,
  updateUploadBatch,
  createAuditLog,
  setBadges,
  updateParticipant,
} from '@/lib/db';
import {
  validateProfileUrl,
  sanitizeString,
  checkRateLimit,
  getClientIP,
  requireJsonContentType,
  validateOrigin,
  logSecurity,
} from '@/lib/security';
import { scrapeProfile, ScrapeError } from '@/lib/scrapeProfile';

export const dynamic = 'force-dynamic';

const MAX_IMPORT_ROWS = 50;

export async function POST(req: Request) {
  const ip = getClientIP(req);

  if (!requireJsonContentType(req)) {
    return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 });
  }

  if (!validateOrigin(req)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'csrf-fac-import', ip });
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (!checkRateLimit(`fac-import:${ip}`, 3, 300)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait 5 minutes.' }, { status: 429 });
  }

  const s = await getSession();
  if (s?.role !== 'facilitator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: '`rows` must be an array of profile URL strings.' }, { status: 400 });
  }

  const rawRows = body.rows as unknown[];
  if (rawRows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMPORT_ROWS} rows per import. Split your file into smaller chunks and retry.` },
      { status: 400 },
    );
  }

  const fileName = sanitizeString((body.file_name as string) ?? 'import.csv', 200);
  let success = 0, failed = 0;
  const results: { url: string; status: 'ok' | 'error'; message?: string }[] = [];

  // Create the batch record before processing so it exists even if we're
  // interrupted mid-loop.  The final counts are written at the end of the
  // loop via updateUploadBatch().
  const batch   = await createUploadBatch(s.facCode!, fileName, rawRows.length, 0, 0);
  const batchId = batch?.id ?? null;

  for (const raw of rawRows) {
    const url = sanitizeString(typeof raw === 'string' ? raw : '', 2_000);
    const v   = validateProfileUrl(url);
    if (!v.ok) {
      failed++;
      results.push({ url, status: 'error', message: v.error });
      continue;
    }

    try {
      let p = await getParticipantByUrl(url);
      if (!p) {
        p = await addParticipant({ name: '', profile_url: url, role: 'participant' });

        try {
          const data = await scrapeProfile(url);
          await setBadges(p.id, data.badges);
          await updateParticipant(p.id, {
            name:        data.name        || '',
            avatar_url:  data.avatar_url,
            last_synced: data.scraped_at,
          });
        } catch (scrapeErr) {
          if (scrapeErr instanceof ScrapeError && scrapeErr.statusCode === 404) {
            // Profile is private or invalid — still import the URL so the
            // facilitator can see it; it will sync once set to public.
            logSecurity('warn', 'api_error', {
              route: 'POST /api/facilitator/import',
              step:  'scrape-404',
              url,
            });
          } else {
            // Non-fatal: participant record exists; data will sync on next cron run.
            logSecurity('warn', 'api_error', {
              route: 'POST /api/facilitator/import',
              step:  'scrape',
              url,
            });
          }
        }
      }

      await addFacilitatorMember(s.facCode!, p.id, 'csv', batchId);
      success++;
      results.push({ url, status: 'ok' });
    } catch {
      failed++;
      results.push({ url, status: 'error', message: 'Processing failed. Please try again.' });
      logSecurity('warn', 'api_error', { route: 'POST /api/facilitator/import', step: 'db' });
    }

    // Throttle requests to Skills Boost to avoid triggering their rate limits.
    await new Promise<void>(r => setTimeout(r, 500));
  }

  // Update the batch record with the final counts now that processing is done.
  if (batchId) {
    try {
      await updateUploadBatch(batchId, { successful: success, failed });
    } catch {
      // Non-fatal: the audit log below has the correct counts.
      logSecurity('warn', 'api_error', {
        route: 'POST /api/facilitator/import',
        step:  'update-batch-counts',
      });
    }
  }

  await createAuditLog(s.facCode!, 'csv_import', batchId ?? undefined, {
    file:    fileName,
    total:   rawRows.length,
    success,
    failed,
  });

  return NextResponse.json({ ok: true, successful: success, failed, batchId, results });
}
