import * as cheerio from 'cheerio';
import { validateScrapeUrl, validateAvatarUrl, logSecurity } from '@/lib/security';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
} as const;

/**
 * Canonical "redirected to home" URLs — indicates a private or invalid profile.
 */
const SKILLS_HOME = new Set([
  'https://www.skills.google/',
  'https://www.skills.google',
]);

/** Maximum redirect hops before aborting (SSRF guard). */
const MAX_REDIRECTS = 3;

/** Network timeout per hop (ms). */
const FETCH_TIMEOUT_MS = 15_000;

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ScrapedBadge {
  badge_name: string;
  category: 'game' | 'skill_badge';
  points: number;
  earned_date: string;
  image_url: string;
}

export interface ScrapeResult {
  name: string;
  avatar_url: string;
  /** The final resolved URL after following redirects. */
  profile_url: string;
  scraped_at: string;
  badges: ScrapedBadge[];
  badges_count: number;
  total_points: number;
}

/**
 * Thrown by `scrapeProfile` when the scrape cannot be completed.
 * `statusCode` maps to the HTTP status the caller should return.
 */
export class ScrapeError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ScrapeError';
  }
}

// ─── BADGE CLASSIFICATION ─────────────────────────────────────────────────────

const GAME_KEYWORDS = [
  'arcade',
  'voyage',
  'base camp',
  'adventure',
  'trail',
  'safe spaces',
  'simulator',
  'trivia',
] as const;

function classifyBadge(title: string): 'game' | 'skill_badge' {
  const lower = title.toLowerCase();
  return GAME_KEYWORDS.some(kw => lower.includes(kw)) ? 'game' : 'skill_badge';
}

// ─── CORE FUNCTION ───────────────────────────────────────────────────────────

export async function scrapeProfile(rawUrl: string): Promise<ScrapeResult> {
  // Normalise legacy cloudskillsboost.google.com URLs to skills.google canonical form.
  let targetUrl = rawUrl
    .replace(
      /^https?:\/\/(www\.)?cloudskillsboost\.google\.com\/public_profiles\//,
      'https://www.skills.google/public_profiles/',
    )
    .replace(
      /^https?:\/\/skills\.google\/public_profiles\//,
      'https://www.skills.google/public_profiles/',
    );

  let currentUrl = targetUrl;
  let finalResponse: Response | null = null;

  // ── Manual redirect following ──────────────────────────────────────────────

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let resp: Response;
    try {
      resp = await fetch(currentUrl, {
        headers:  FETCH_HEADERS,
        redirect: 'manual',
        cache:    'no-store',
        signal:   AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      logSecurity('warn', 'api_error', {
        reason: 'fetch_failed',
        url:    currentUrl,
        err:    err instanceof Error ? err.message : 'unknown',
      });
      throw new ScrapeError(502, 'Failed to reach Skills Boost. Please try again.');
    }

    if (resp.status >= 300 && resp.status < 400) {
      if (hop === MAX_REDIRECTS) {
        logSecurity('warn', 'ssrf_attempt', {
          reason: 'redirect_limit_exceeded',
          url:    currentUrl,
        });
        throw new ScrapeError(400, 'Too many redirects from the profile URL.');
      }

      const location = resp.headers.get('location');
      if (!location) {
        finalResponse = resp;
        break;
      }

      let nextUrl: string;
      try {
        nextUrl = new URL(location, currentUrl).href;
      } catch {
        throw new ScrapeError(400, 'Invalid redirect URL encountered.');
      }

      // Re-validate the redirect destination before following.
      const recheck = validateScrapeUrl(nextUrl);
      if (!recheck.ok) {
        logSecurity('warn', 'ssrf_attempt', {
          reason:  'redirect_to_disallowed_host',
          from:    currentUrl,
          to:      nextUrl,
          detail:  recheck.error,
        });
        throw new ScrapeError(400, 'Redirect destination is not permitted.');
      }

      // A redirect to the Skills Boost home page means the profile is private or invalid.
      const normalized = nextUrl.endsWith('/') ? nextUrl : nextUrl + '/';
      if (SKILLS_HOME.has(nextUrl) || SKILLS_HOME.has(normalized)) {
        throw new ScrapeError(
          404,
          'Profile not found or set to private. ' +
          'Please change your profile visibility to Public in Skills Boost settings.',
        );
      }

      currentUrl = nextUrl;
      continue;
    }

    finalResponse = resp;
    break;
  }

  if (!finalResponse || !finalResponse.ok) {
    throw new ScrapeError(
      502,
      'Failed to retrieve data from Google Skills Boost. Please try again later.',
    );
  }

  // ── HTML parsing ───────────────────────────────────────────────────────────
  const html = await finalResponse.text();
  const $    = cheerio.load(html);

  // Name
  const name =
    $('h1').first().text().trim() ||
    $('.ql-display-1').first().text().trim() ||
    'Google Cloud Learner';

  // Avatar — validate against the CSP allowlist before storing (M-6 fix).
  let rawAvatar =
    $('ql-avatar.profile-avatar').attr('src') ||
    $('.profile-avatar').attr('src')          ||
    $('.profile-avatar img, .avatar img').first().attr('src') ||
    '';
  if (rawAvatar.startsWith('//')) rawAvatar = 'https:' + rawAvatar;
  const avatar_url = validateAvatarUrl(rawAvatar);

  // Badges
  const badges: ScrapedBadge[] = [];

  $('.profile-badge').each((_, el) => {
    const title    = $(el).find('.ql-title-medium, .ql-subheading-1').text().trim();
    const dateText = $(el).find('.ql-body-medium, .ql-body-large, .ql-label-medium').text().trim();
    const imageUrl = $(el).find('img').attr('src') || '';
    if (!title) return;

    const cleanDate  = dateText.replace(/Earned\s+(on\s+)?/i, '').trim();
    const parsed     = cleanDate ? new Date(cleanDate) : null;
    const earnedDate =
      parsed && !isNaN(parsed.getTime())
        ? parsed.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    const category = classifyBadge(title);

    badges.push({
      badge_name:  title,
      category,
      points:      category === 'game' ? 1 : 0.5,
      earned_date: earnedDate,
      image_url:   imageUrl,
    });
  });

  const gameBadges  = badges.filter(b => b.category === 'game');
  const skillBadges = badges.filter(b => b.category === 'skill_badge');
  const total_points = gameBadges.length + skillBadges.length * 0.5;

  return {
    name,
    avatar_url,
    profile_url:  currentUrl,
    scraped_at:   new Date().toISOString(),
    badges,
    badges_count: badges.length,
    total_points,
  };
}
