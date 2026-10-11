// ─── ALLOWED DOMAINS (SSRF allowlist) ────────────────────────────────────────
import { timingSafeEqual } from 'crypto';

const ALLOWED_PROFILE_HOSTNAMES = new Set([
  'cloudskillsboost.google.com',
  'www.cloudskillsboost.google.com',
  'skills.google',
  'www.skills.google',
]);

/**
 * Allowed hostnames for scraped avatar images.
 * Must match the `img-src` directive in the Content-Security-Policy header
 * set in src/middleware.ts.
 */
export const ALLOWED_AVATAR_HOSTNAMES = new Set([
  'cdn.qwiklabs.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
  'googleusercontent.com',
]);

/** Private / link-local / loopback ranges (SSRF protection). */
const INTERNAL_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^0\./,
  /^localhost$/i,
  /^metadata\.google\.internal$/i,
];

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

type SecurityLevel    = 'info' | 'warn' | 'error';
type SecurityEventType =
  | 'rate_limit_hit'
  | 'ssrf_attempt'
  | 'invalid_uuid'
  | 'invalid_url'
  | 'invalid_input'
  | 'idor_attempt'
  | 'auth_failure'
  | 'cron_unauthorized'
  | 'cron_completed'
  | 'api_error'
  | 'sync_error';

// ─── LOGGING ──────────────────────────────────────────────────────────────────

export function logSecurity(
  level: SecurityLevel,
  event: SecurityEventType,
  meta?: Record<string, unknown>,
): void {
  const entry = {
    ts:    new Date().toISOString(),
    level,
    event,
    ...(meta ? { meta } : {}),
  };

  if (level === 'error')      console.error('[SECURITY]', JSON.stringify(entry));
  else if (level === 'warn')  console.warn('[SECURITY]',  JSON.stringify(entry));
  else                        console.info('[SECURITY]',  JSON.stringify(entry));
}

// ─── STARTUP SECRET VALIDATION ───────────────────────────────────────────────

const PLACEHOLDER_FRAGMENTS = [
  'change-this',
  'your-random',
  'placeholder',
  'secret-here',
  'example',
  'replace-with',
];

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_FRAGMENTS.some(f => lower.includes(f));
}

export function assertSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || isPlaceholder(secret)) {
    throw new Error(
      '[security] SESSION_SECRET is missing or uses a placeholder. ' +
      'Set a cryptographically random value: openssl rand -base64 32',
    );
  }
  return secret;
}

export function assertAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 16 || isPlaceholder(secret)) {
    throw new Error(
      '[security] ADMIN_SECRET is missing or uses a placeholder. ' +
      'Set a high-entropy value: openssl rand -base64 24',
    );
  }
  return secret;
}

// ─── SSRF PROTECTION ─────────────────────────────────────────────────────────

export function validateProfileUrl(rawUrl: string): ValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'https:') {
    logSecurity('warn', 'ssrf_attempt', { reason: 'non-https' });
    return { ok: false, error: 'Only HTTPS profile URLs are accepted.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_PROFILE_HOSTNAMES.has(host)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'disallowed-host', host });
    return {
      ok: false,
      error: 'Profile URL must be from cloudskillsboost.google.com or skills.google.',
    };
  }

  if (INTERNAL_PATTERNS.some(re => re.test(host))) {
    logSecurity('error', 'ssrf_attempt', { reason: 'internal-host', host });
    return { ok: false, error: 'Internal hosts are not allowed.' };
  }

  if (!parsed.pathname.includes('/public_profiles/')) {
    return {
      ok: false,
      error: 'URL must point to a public Skills Boost profile (/public_profiles/…).',
    };
  }

  return { ok: true };
}

/**
 * Stricter variant used when scraping: also rejects query strings and fragments.
 */
export function validateScrapeUrl(rawUrl: string): ValidationResult {
  const profileCheck = validateProfileUrl(rawUrl);
  if (!profileCheck.ok) return profileCheck;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Invalid URL.' };
  }

  if (parsed.search) {
    return { ok: false, error: 'URL query strings are not allowed.' };
  }

  if (parsed.hash) {
    return { ok: false, error: 'URL fragments are not allowed.' };
  }

  return { ok: true };
}

// ─── AVATAR URL VALIDATION ───────────────────────────────────────────────────

/**
 * Returns the cleaned avatar URL if it points to an allowed CDN host,
 * or an empty string otherwise.
 */
export function validateAvatarUrl(raw: string): string {
  if (!raw) return '';
  try {
    const candidate = raw.startsWith('//') ? 'https:' + raw : raw;
    const u = new URL(candidate);
    if (u.protocol !== 'https:') return '';
    if (!ALLOWED_AVATAR_HOSTNAMES.has(u.hostname)) return '';
    return u.href;
  } catch {
    return '';
  }
}

// ─── UUID VALIDATION ──────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUUID(id: unknown): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

// ─── INPUT SANITISATION ───────────────────────────────────────────────────────

const ROLE_ALLOWLIST = new Set(['participant', 'facilitator']);

export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\x00-\x1F\x7F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLength);
}

export function validateRole(role: unknown): 'participant' | 'facilitator' {
  const r = sanitizeString(role).toLowerCase();
  return ROLE_ALLOWLIST.has(r) ? (r as 'participant' | 'facilitator') : 'participant';
}

export function validateParticipantInput(body: unknown): ValidationResult & {
  profile_url?: string;
  role?: 'participant' | 'facilitator';
} {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;

  const rawUrl = sanitizeString(b.profile_url, 2000);
  if (!rawUrl) return { ok: false, error: 'profile_url is required.' };

  const urlCheck = validateProfileUrl(rawUrl);
  if (!urlCheck.ok) return { ok: false, error: urlCheck.error };

  const role = validateRole(b.role);
  return { ok: true, profile_url: rawUrl, role };
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string' || email.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const lower = email.toLowerCase();
  return (
    !lower.endsWith('@placeholder.com') && !lower.endsWith('@example.com')
  );
}

// ─── HTML ESCAPING ────────────────────────────────────────────────────────────

/**
 * Escapes the five HTML-special characters.  Use this on every user-supplied
 * string before interpolating it into an HTML template (e.g. email bodies).
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ─── RATE LIMITING ────────────────────────────────────────────────────────────

interface RateEntry { count: number; resetAt: number }
const _rateMap = new Map<string, RateEntry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _rateMap) {
      if (now > v.resetAt) _rateMap.delete(k);
    }
  }, 600_000);
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): boolean {
  const now   = Date.now();
  const entry = _rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    _rateMap.set(key, { count: 1, resetAt: now + windowSec * 1_000 });
    return true;
  }

  if (entry.count >= limit) {
    logSecurity('warn', 'rate_limit_hit', { key, limit });
    return false;
  }

  entry.count++;
  return true;
}

// ─── REQUEST HELPERS ──────────────────────────────────────────────────────────

export function getClientIP(req: Request): string {
  // Vercel internal header — not settable by end clients.
  const vercel = req.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();

  // Cloudflare — only trust when CF is confirmed in the path.
  if (process.env.CF_ZONE_ID) {
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf.trim();
  }

  // Trusted reverse proxy (nginx, etc.).
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();

  // Use the RIGHTMOST X-Forwarded-For entry (nearest known-good proxy),
  // not the leftmost (client-supplied, easily spoofed).
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map(s => s.trim()).filter(Boolean);
    return parts[parts.length - 1];
  }

  return 'unknown';
}

export function safeCompare(a: string, b: string): boolean {
  const aBuf   = Buffer.from(a);
  const bBuf   = Buffer.from(b);
  const maxLen = Math.max(aBuf.length, bBuf.length);
  const aPad   = Buffer.concat([aBuf, Buffer.alloc(maxLen - aBuf.length)]);
  const bPad   = Buffer.concat([bBuf, Buffer.alloc(maxLen - bBuf.length)]);
  return timingSafeEqual(aPad, bPad) && aBuf.length === bBuf.length;
}

export function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logSecurity('warn', 'cron_unauthorized', { reason: 'CRON_SECRET_not_set' });
    return false;
  }
  const header = req.headers.get('authorization') ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!safeCompare(token, secret)) {
    logSecurity('warn', 'cron_unauthorized', { reason: 'invalid_token' });
    return false;
  }
  return true;
}

export function verifyInternalCronHeader(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('x-internal-cron-secret') ?? '';
  return safeCompare(header, secret);
}

// ─── CONTENT SECURITY POLICY ─────────────────────────────────────────────────

export { buildCsp, SECURITY_HEADERS, toNextHeaders } from './csp';

// ─── ADDITIONAL HARDENING ─────────────────────────────────────────────────────

export const MAX_BODY_BYTES = 1_048_576;

export function requireJsonContentType(req: Request): boolean {
  const ct = req.headers.get('content-type') ?? '';
  return ct.includes('application/json');
}

/**
 * CSRF origin check.  Fails closed in production when NEXT_PUBLIC_APP_URL is
 * absent.
 */
export function validateOrigin(req: Request): boolean {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL;
  const origin  = req.headers.get('origin');
  const referer = req.headers.get('referer');

  if (!appUrl) {
    if (process.env.NODE_ENV === 'production') {
      logSecurity('error', 'invalid_input', {
        reason: 'NEXT_PUBLIC_APP_URL_not_set_in_production',
      });
      return false;
    }
    if (!origin && !referer) return true; // server-to-server in dev
    return true; // permissive in local dev only
  }

  if (process.env.NODE_ENV === 'development') {
    const isLocal = (val: string | null) =>
      !val ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(val);
    if (isLocal(origin) && isLocal(referer)) return true;
  }

  const allowed = new URL(appUrl).origin;

  if (origin && origin !== allowed) return false;
  if (referer) {
    try {
      if (new URL(referer).origin !== allowed) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function requestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── MISSING EXPORTS (needed by API routes) ────────────────────────────────────

/**
 * Reads and parses a JSON body with a 1 MiB size cap to prevent DoS via
 * large request bodies. Returns null when the body is empty or malformed.
 */
export async function readBoundedJson(
  req: Request,
  maxBytes = MAX_BODY_BYTES,
): Promise<Record<string, unknown> | null> {
  try {
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
    if (!isNaN(contentLength) && contentLength > maxBytes) return null;

    // Clone the request so the body can still be read elsewhere if needed.
    const text = await req.clone().text();
    if (text.length > maxBytes) return null;
    if (!text.trim()) return null;

    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Parses a query-string value as a positive integer, clamped within [0, max].
 * Returns `defaultVal` when the value is missing, NaN, or out of range.
 */
export function parsePosInt(
  value: string | null | undefined,
  defaultVal: number,
  max: number,
): number {
  if (value === null || value === undefined) return defaultVal;
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0) return defaultVal;
  return Math.min(n, max);
}
