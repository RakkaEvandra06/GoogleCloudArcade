import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import {
  validateScrapeUrl,
  checkRateLimit,
  getClientIP,
  logSecurity,
  sanitizeString,
  sanitizeImageUrl,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

const FETCH_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
} as const;

/** Canonical "you were redirected to the home page" URLs — indicates a private/invalid profile */
const SKILLS_HOME = new Set(['https://www.skills.google/', 'https://www.skills.google']);

const MAX_REDIRECTS = 3;

export async function GET(request: Request) {
  const ip = getClientIP(request);
  if (!checkRateLimit(`scrape:${ip}`, 20, 60)) {
    return NextResponse.json({ error: 'Too many scrape requests. Please wait.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawUrl = sanitizeString(searchParams.get('url') ?? '', 2000);

  if (!rawUrl) return NextResponse.json({ error: 'URL profil wajib diisi.' }, { status: 400 });

// ── SSRF protection: validate before any fetch ─────────────────────────────
  const validation = validateScrapeUrl(rawUrl);
  if (!validation.ok) {
    logSecurity('warn', 'invalid_url', { reason: validation.error });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

// Normalise any variant → canonical https://www.skills.google/public_profiles/…
  const targetUrl = rawUrl
    .replace(
      /^https?:\/\/(www\.)?cloudskillsboost\.google\.com\/public_profiles\//,
      'https://www.skills.google/public_profiles/',
    )
    .replace(
      /^https?:\/\/skills\.google\/public_profiles\//,
      'https://www.skills.google/public_profiles/',
    );

  try {
    let currentUrl    = targetUrl;
    let finalResponse: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const resp = await fetch(currentUrl, {
        headers:  FETCH_HEADERS,
        redirect: 'manual',
        cache:    'no-store',
        signal:   AbortSignal.timeout(15_000),
      });

      if (resp.status >= 300 && resp.status < 400) {
        if (hop === MAX_REDIRECTS) {
          logSecurity('warn', 'ssrf_attempt', { reason: 'redirect_limit_exceeded', url: currentUrl });
          return NextResponse.json({ error: 'Too many redirects.' }, { status: 400 });
        }

        const location = resp.headers.get('location');
        if (!location) { finalResponse = resp; break; }

// Resolve relative URLs (e.g. /login?return=…)
        let nextUrl: string;
        try { nextUrl = new URL(location, currentUrl).href; }
        catch { return NextResponse.json({ error: 'Invalid redirect URL.' }, { status: 400 }); }

// Re-validate the redirect destination before following it
        const recheck = validateScrapeUrl(nextUrl);
        if (!recheck.ok) {
          logSecurity('warn', 'ssrf_attempt', {
            reason: 'redirect_to_disallowed_host',
            from:   currentUrl,
            to:     nextUrl,
            detail: recheck.error,
          });
          return NextResponse.json({ error: 'Redirect destination not permitted.' }, { status: 400 });
        }

 // Detect private/missing profile redirect
        if (SKILLS_HOME.has(nextUrl) || SKILLS_HOME.has(nextUrl.replace(/\/$/, '') + '/')) {
          return NextResponse.json({
            error: 'Profil tidak ditemukan atau disetel ke Privat. Silakan ubah pengaturan profil Anda menjadi Publik.',
          }, { status: 404 });
        }

        currentUrl = nextUrl;
        continue;
      }

      finalResponse = resp;
      break;
    }

    if (!finalResponse || !finalResponse.ok) {
      return NextResponse.json(
        { error: 'Gagal mengambil data dari Google Skills Boost. Silakan coba beberapa saat lagi.' },
        { status: 502 },
      );
    }

    const html = await finalResponse.text();
    const $    = cheerio.load(html);

// ── Extract name ───────────────────────────────────────────────────────
    const name = $('h1').first().text().trim()
      || $('.ql-display-1').first().text().trim()
      || 'Google Cloud Learner';

// ── Extract avatar ─────────────────────────────────────────────────────
    const rawAvatarUrl =
      $('ql-avatar.profile-avatar').attr('src') ||
      $('.profile-avatar').attr('src')           ||
      $('.profile-avatar img, .avatar img').first().attr('src') ||
      '';

    const avatarUrl = sanitizeImageUrl(rawAvatarUrl);

// ── Extract badges ─────────────────────────────────────────────────────
    type Badge = {
      badge_name:  string;
      category:    'game' | 'skill_badge';
      points:      number;
      earned_date: string;
      image_url:   string;
    };
    const badges: Badge[] = [];

    $('.profile-badge').each((_, el) => {
      const title    = $(el).find('.ql-title-medium, .ql-subheading-1').text().trim();
      const dateText = $(el).find('.ql-body-medium, .ql-body-large, .ql-label-medium').text().trim();
      const rawImageUrl = $(el).find('img').attr('src') || '';
      const imageUrl    = sanitizeImageUrl(rawImageUrl);

      if (!title) return;

      const cleanDate  = dateText.replace(/Earned\s+(on\s+)?/i, '').trim();
      const parsed     = cleanDate ? new Date(cleanDate) : null;
      const earnedDate = parsed && !isNaN(parsed.getTime())
        ? parsed.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const lower  = title.toLowerCase();
      const isGame = ['arcade','voyage','base camp','adventure','trail','safe spaces','simulator','trivia']
        .some(kw => lower.includes(kw));

      badges.push({
        badge_name:  title,
        category:    isGame ? 'game' : 'skill_badge',
        points:      isGame ? 1 : 0.5,
        earned_date: earnedDate,
        image_url:   imageUrl,
      });
    });

    const gameBadges  = badges.filter(b => b.category === 'game');
    const skillBadges = badges.filter(b => b.category === 'skill_badge');
    const totalPoints = gameBadges.length + skillBadges.length * 0.5;

    return NextResponse.json({
      name,
      avatar_url:   avatarUrl,
      profile_url:  currentUrl,
      scraped_at:   new Date().toISOString(),
      badges_count: badges.length,
      total_points: totalPoints,
      badges,
    });

  } catch (error: unknown) {
// Log server-side only — raw error strings must never reach the client
    console.error('[scrape] fetch error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json(
      { error: 'Gagal mengambil data dari Google Skills Boost. Silakan coba beberapa saat lagi.' },
      { status: 500 },
    );
  }
}
