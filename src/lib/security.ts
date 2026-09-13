// ─── IMPORTS ─────────────────────────────────────────────────────────────────
import { timingSafeEqual } from 'crypto';
// Supabase client used solely for checkRateLimitDb() — kept separate from
// db.ts to avoid a circular-import chain: security → db → session → security.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ─── ALLOWED DOMAINS ─────────────────────────────────────────────────────────
const ALLOWED_PROFILE_HOSTNAMES = new Set([
  'cloudskillsboost.google.com',
  'www.cloudskillsboost.google.com',
  'skills.google',
  'www.skills.google',
]);

/** CDN hostnames permitted in stored image URLs (mirrors the img-src CSP). */
const ALLOWED_IMAGE_HOSTNAMES = new Set([
  'cdn.qwiklabs.com',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
  'googleusercontent.com',
]);

/** Private / link-local / loopback ranges blocked for SSRF protection */
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
  const entry = { ts: new Date().toISOString(), level, event, ...(meta ? { meta } : {}) };
  if (level === 'error') console.error('[SECURITY]', JSON.stringify(entry));
  else if (level === 'warn') console.warn('[SECURITY]', JSON.stringify(entry));
  else console.info('[SECURITY]', JSON.stringify(entry));
}

// ─── PLACEHOLDER DETECTION ───────────────────────────────────────────────────
const PLACEHOLDER_FRAGMENTS = ['change-this', 'your-random', 'placeholder', 'secret-here', 'example'];

/** [MERGED from REF] Now exported so session.ts / middleware.ts can reference
 *  it directly rather than duplicating the same logic. */
export function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_FRAGMENTS.some(f => lower.includes(f));
}

export function assertSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || isPlaceholder(secret)) {
    throw new Error('[security] SESSION_SECRET is missing or uses a placeholder. Generate: openssl rand -base64 32');
  }
  return secret;
}

export function assertAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 16 || isPlaceholder(secret)) {
    throw new Error('[security] ADMIN_SECRET is missing or uses a placeholder. Generate: openssl rand -base64 24');
  }
  return secret;
}

// ─── SSRF PROTECTION ─────────────────────────────────────────────────────────

export function validateProfileUrl(rawUrl: string): ValidationResult {
  let parsed: URL;
  try { parsed = new URL(rawUrl.trim()); }
  catch { return { ok: false, error: 'Invalid URL format.' }; }

  if (parsed.protocol !== 'https:') {
    logSecurity('warn', 'ssrf_attempt', { reason: 'non-https' });
    return { ok: false, error: 'Only HTTPS profile URLs are accepted.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_PROFILE_HOSTNAMES.has(host)) {
    logSecurity('warn', 'ssrf_attempt', { reason: 'disallowed-host' });
    return { ok: false, error: 'Profile URL must be from cloudskillsboost.google.com or skills.google.com.' };
  }

  if (INTERNAL_PATTERNS.some(re => re.test(host))) {
    logSecurity('error', 'ssrf_attempt', { reason: 'internal-host' });
    return { ok: false, error: 'Internal hosts are not allowed.' };
  }

  if (!parsed.pathname.includes('/public_profiles/')) {
    return { ok: false, error: 'URL must point to a public Skills Boost profile (/public_profiles/…).' };
  }

  return { ok: true };
}

export function validateScrapeUrl(rawUrl: string): ValidationResult {
  const profileCheck = validateProfileUrl(rawUrl);
  if (!profileCheck.ok) return profileCheck;
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return { ok: false, error: 'Invalid URL.' }; }
  if (parsed.hash) return { ok: false, error: 'URL fragments are not allowed.' };
  return { ok: true };
}

export function sanitizeImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const url = rawUrl.startsWith('//') ? 'https:' + rawUrl : rawUrl;
  if (!url.startsWith('https://')) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return '';
    if (!ALLOWED_IMAGE_HOSTNAMES.has(parsed.hostname)) return '';
    return url;
  } catch { return ''; }
}

// ─── UUID VALIDATION ──────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateUUID(id: unknown): id is string { return typeof id === 'string' && UUID_RE.test(id); }

// ─── INPUT SANITISATION ───────────────────────────────────────────────────────
const ROLE_ALLOWLIST = new Set(['participant', 'facilitator']);

export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

export function validateRole(role: unknown): 'participant' | 'facilitator' {
  const r = sanitizeString(role).toLowerCase();
  return ROLE_ALLOWLIST.has(r) ? (r as 'participant' | 'facilitator') : 'participant';
}

export function validateParticipantInput(body: unknown): ValidationResult & {
  profile_url?: string; role?: 'participant' | 'facilitator';
} {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Request body must be a JSON object.' };
  const b = body as Record<string, unknown>;
  const rawUrl = sanitizeString(b.profile_url, 2000);
  if (!rawUrl) return { ok: false, error: 'profile_url is required.' };
  const urlCheck = validateProfileUrl(rawUrl);
  if (!urlCheck.ok) return { ok: false, error: urlCheck.error };
  return { ok: true, profile_url: rawUrl, role: validateRole(b.role) };
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string' || email.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const lower = email.toLowerCase();
  return !lower.endsWith('@placeholder.com') && !lower.endsWith('@example.com');
}

// ─── HTML ESCAPING ────────────────────────────────────────────────────────────
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── IN-PROCESS RATE LIMITING ─────────────────────────────────────────────────

interface RateEntry { count: number; resetAt: number }
const _rateMap = new Map<string, RateEntry>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _rateMap) if (now > v.resetAt) _rateMap.delete(k);
  }, 600_000);
}

export function checkRateLimit(key: string, limit: number, windowSec: number): boolean {
  const now   = Date.now();
  const entry = _rateMap.get(key);
  if (!entry || now > entry.resetAt) { _rateMap.set(key, { count: 1, resetAt: now + windowSec * 1000 }); return true; }
  if (entry.count >= limit) { logSecurity('warn', 'rate_limit_hit', { key, limit }); return false; }
  entry.count++;
  return true;
}

// ─── DATABASE-BACKED RATE LIMITING (serverless-safe) ─────────────────────────

let _rlClient: SupabaseClient | null = null;

function getRlClient(): SupabaseClient | null {
  if (_rlClient) return _rlClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _rlClient = createClient(url, key, { auth: { persistSession: false } });
  return _rlClient;
}

interface RlRecord { count: number; resetAt: number }

export async function checkRateLimitDb(key: string, limit: number, windowSec: number): Promise<boolean> {
  const db = getRlClient();
  if (!db) return checkRateLimit(key, limit, windowSec); // fallback to in-process
  const dbKey = `rl_${key.replace(/[^a-z0-9_:.-]/gi, '_').slice(0, 100)}`;
  const now   = Date.now();
  try {
    const { data } = await db.from('system_settings').select('value').eq('key', dbKey).maybeSingle();
    const stored: RlRecord | null = data?.value ? JSON.parse(data.value) : null;
    if (!stored || now > stored.resetAt) {
      await db.from('system_settings').upsert({ key: dbKey, value: JSON.stringify({ count: 1, resetAt: now + windowSec * 1_000 }) }, { onConflict: 'key' });
      return true;
    }
    if (stored.count >= limit) { logSecurity('warn', 'rate_limit_hit', { key, limit, source: 'db' }); return false; }
    await db.from('system_settings').upsert({ key: dbKey, value: JSON.stringify({ count: stored.count + 1, resetAt: stored.resetAt }) }, { onConflict: 'key' });
    return true;
  } catch (err) {
    console.error('[rate-limit-db] error, failing open:', err instanceof Error ? err.message : err);
    return true;
  }
}

// ─── REQUEST HELPERS ──────────────────────────────────────────────────────────

export function getClientIP(req: Request): string {
  return req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-real-ip')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? 'unknown';
}

export function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a), bBuf = Buffer.from(b);
  const maxLen = Math.max(aBuf.length, bBuf.length);
  const aPad = Buffer.concat([aBuf, Buffer.alloc(maxLen - aBuf.length)]);
  const bPad = Buffer.concat([bBuf, Buffer.alloc(maxLen - bBuf.length)]);
  return timingSafeEqual(aPad, bPad) && aBuf.length === bBuf.length;
}

export function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || isPlaceholder(secret)) {
    logSecurity('warn', 'cron_unauthorized', {
      reason: secret ? 'CRON_SECRET_is_placeholder' : 'CRON_SECRET_not_set',
    });
    return false;
  }
  const header = req.headers.get('authorization') ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!safeCompare(token, secret)) { logSecurity('warn', 'cron_unauthorized', { reason: 'invalid_token' }); return false; }
  return true;
}

export function verifyInternalCronHeader(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || isPlaceholder(secret)) return false;
  return safeCompare(req.headers.get('x-internal-cron-secret') ?? '', secret);
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
    "script-src 'self' 'unsafe-inline'",
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

export function toNextHeaders() {
  return Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));
}

export const MAX_BODY_BYTES = 1_048_576;

export function requireJsonContentType(req: Request): boolean {
  return (req.headers.get('content-type') ?? '').includes('application/json');
}

export function validateOrigin(req: Request): boolean {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL;
  const origin  = req.headers.get('origin');
  const referer = req.headers.get('referer');

  if (!appUrl) {
    if (!origin && !referer) return true;
    return true;
  }

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
