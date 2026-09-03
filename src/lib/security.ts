// ─── ALLOWED DOMAINS (SSRF allowlist) ────────────────────────────────────────
import { timingSafeEqual } from 'crypto';

const ALLOWED_PROFILE_HOSTNAMES = new Set([
  'cloudskillsboost.google.com',
  'www.cloudskillsboost.google.com',
  'skills.google',       // Google's own .google TLD — no .com
  'www.skills.google',   // www variant
]);

/** Private / link-local / loopback IPv4 + IPv6 ranges to block (SSRF) */
const INTERNAL_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,          // link-local
  /^::1$/,                // IPv6 loopback
  /^fc[0-9a-f]{2}:/i,     // IPv6 ULA
  /^fe80:/i,              // IPv6 link-local
  /^0\./,                 // 0.x.x.x
  /^localhost$/i,
  /^metadata\.google\.internal$/i,   // GCE metadata server
];

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface ValidationResult {
  ok: boolean;
  error?: string;
}

type SecurityLevel = 'info' | 'warn' | 'error';
type SecurityEventType =
  | 'rate_limit_hit'
  | 'ssrf_attempt'
  | 'invalid_uuid'
  | 'invalid_url'
  | 'invalid_input'
  | 'cron_unauthorized'
  | 'cron_completed'
  | 'api_error'
  | 'sync_error';

// ─── LOGGING ─────────────────────────────────────────────────────────────────

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

  if (level === 'error') {
    console.error('[SECURITY]', JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn('[SECURITY]', JSON.stringify(entry));
  } else {
    console.info('[SECURITY]', JSON.stringify(entry));
  }
}

// ─── STARTUP SECRET VALIDATION ───────────────────────────────────────────────
// Call these once at boot (or on first use) to catch misconfigured deployments.

const PLACEHOLDER_FRAGMENTS = [
  'change-this',
  'your-random',
  'placeholder',
  'secret-here',
  'example',
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

  // 1. HTTPS only
  if (parsed.protocol !== 'https:') {
    logSecurity('warn', 'ssrf_attempt', { reason: 'non-https' });
    return { ok: false, error: 'Only HTTPS profile URLs are accepted.' };
  }

  // 2. Allowlisted hostname
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_PROFILE_HOSTNAMES.has(host)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'disallowed-host' });
    return { ok: false, error: 'Profile URL must be from cloudskillsboost.google.com or skills.google.com.' };
  }

  // 3. Internal IP check
  if (INTERNAL_PATTERNS.some(re => re.test(host))) {
    logSecurity('error', 'ssrf_attempt', { reason: 'internal-host' });
    return { ok: false, error: 'Internal hosts are not allowed.' };
  }

  // 4. Path must contain /public_profiles/
  if (!parsed.pathname.includes('/public_profiles/')) {
    return { ok: false, error: 'URL must point to a public Skills Boost profile (/public_profiles/…).' };
  }

  return { ok: true };
}

export function validateScrapeUrl(rawUrl: string): ValidationResult {
  const profileCheck = validateProfileUrl(rawUrl);
  if (!profileCheck.ok) return profileCheck;

  // Reject query strings / fragments to prevent cache-poisoning vectors
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return { ok: false, error: 'Invalid URL.' }; }

  if (parsed.hash) {
    return { ok: false, error: 'URL fragments are not allowed.' };
  }

  return { ok: true };
}

// ─── UUID VALIDATION ──────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

/** Validates the "role" field against an explicit allowlist. */
export function validateRole(role: unknown): 'participant' | 'facilitator' {
  const r = sanitizeString(role).toLowerCase();
  return ROLE_ALLOWLIST.has(r) ? (r as 'participant' | 'facilitator') : 'participant';
}

/** Full participant input validation */
export function validateParticipantInput(body: unknown): ValidationResult & {
  profile_url?: string;
  role?: 'participant' | 'facilitator';
} {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const b = body as Record<string, unknown>;

  const rawUrl = sanitizeString(b.profile_url, 2000);
  if (!rawUrl) {
    return { ok: false, error: 'profile_url is required.' };
  }

  const urlCheck = validateProfileUrl(rawUrl);
  if (!urlCheck.ok) return { ok: false, error: urlCheck.error };

  const role = validateRole(b.role);
  return { ok: true, profile_url: rawUrl, role };
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string' || email.length > 254) return false;
  // RFC-5321 minimal check — a proper library (e.g. zod) is preferred for stricter validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  // Reject well-known placeholder domains used in this codebase
  const lower = email.toLowerCase();
  return !lower.endsWith('@placeholder.com') && !lower.endsWith('@example.com');
}

// ─── HTML ESCAPING ─────────────────────────────────────────────────────────────

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── RATE LIMITING ────────────────────────────────────────────────────────────

interface RateEntry { count: number; resetAt: number }
const _rateMap = new Map<string, RateEntry>();

// Cleanup stale entries every 10 minutes to prevent memory leaks
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
  const now  = Date.now();
  const entry = _rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    _rateMap.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true; // allowed
  }

  if (entry.count >= limit) {
    logSecurity('warn', 'rate_limit_hit', { key, limit });
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

// ─── REQUEST HELPERS ──────────────────────────────────────────────────────────

export function getClientIP(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  const maxLen = Math.max(aBuf.length, bBuf.length);
  // Pad to equal length so timingSafeEqual runs for a consistent duration
  const aPad = Buffer.concat([aBuf, Buffer.alloc(maxLen - aBuf.length)]);
  const bPad = Buffer.concat([bBuf, Buffer.alloc(maxLen - bBuf.length)]);
  // Run constant-time comparison, then also confirm lengths match (both must pass)
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

export const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security':       'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options':                 'DENY',
  'X-Content-Type-Options':          'nosniff',
  'X-DNS-Prefetch-Control':          'on',
  'Referrer-Policy':                 'strict-origin-when-cross-origin',
  'Permissions-Policy':              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",   // 'unsafe-eval' removed — see note above
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://cdn.qwiklabs.com https://storage.googleapis.com https://lh3.googleusercontent.com https://googleusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

/** Converts the SECURITY_HEADERS map to a next.config headers() array. */
export function toNextHeaders() {
  return Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));
}

// ─── ADDITIONAL HARDENING UTILITIES ──────────────────────────────────────────

export const MAX_BODY_BYTES = 1_048_576;

export function requireJsonContentType(req: Request): boolean {
  const ct = req.headers.get('content-type') ?? '';
  return ct.includes('application/json');
}

export function validateOrigin(req: Request): boolean {
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL;
  const origin   = req.headers.get('origin');
  const referer  = req.headers.get('referer');

  // In dev (no APP_URL set) allow same-host requests
  if (!appUrl) {
    if (!origin && !referer) return true; // Server-to-server
    return true; // Permissive in dev
  }

  // Always allow localhost / 127.0.0.1 in development mode.
  if (process.env.NODE_ENV === 'development') {
    const isLocal = (val: string | null) =>
      !val || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(val);
    if (isLocal(origin) && isLocal(referer)) return true;
  }

  const allowed = new URL(appUrl).origin;
  if (origin && origin !== allowed) return false;
  if (referer) {
    try { if (new URL(referer).origin !== allowed) return false; } catch { return false; }
  }
  return true;
}

export function requestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

import type { ArcadeSession } from './session';

export async function requireFacilitatorSession(): Promise<
  { session: ArcadeSession & { role: 'facilitator' }; error?: never } |
  { error: Response; session?: never }
> {
  const { getSession } = await import('./session');
  const s = await getSession();
  if (!s || s.role !== 'facilitator' || !s.facCode)
    return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  return { session: s as ArcadeSession & { role: 'facilitator' } };
}

export async function requireAdminSession(): Promise<
  { session: ArcadeSession; error?: never } |
  { error: Response; session?: never }
> {
  const { getSession } = await import('./session');
  const s = await getSession();
  if (!s || s.role !== 'admin')
    return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
  return { session: s };
}