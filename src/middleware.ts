import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/session-constants';
import { buildCsp, SECURITY_HEADERS } from '@/lib/csp';

// ─── SECRET RESOLUTION ───────────────────────────────────────────────────────

const PLACEHOLDER_FRAGMENTS = [
  'change-this',
  'your-random',
  'placeholder',
  'secret-here',
  'example',
  'replace-with',
] as const;

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_FRAGMENTS.some(f => lower.includes(f));
}

function resolveSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32 || isPlaceholder(s)) {
    const msg =
      '[middleware] SESSION_SECRET is missing, too short (< 32 chars), or uses ' +
      'a placeholder.  All sessions are being rejected.  ' +
      'Fix: openssl rand -base64 32  then add it to your environment variables.';
    console.error(msg);
    // Return a random per-request key — every cookie will fail verification,
    // which is far safer than accepting cookies signed with a known value.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return s;
}

// ─── COOKIE VERIFICATION (Edge-compatible Web Crypto) ────────────────────────

async function getRole(cookieValue: string): Promise<string | null> {
  try {
    const dot = cookieValue.lastIndexOf('.');
    if (dot < 0) return null;

    const data   = cookieValue.slice(0, dot);
    const sigHex = cookieValue.slice(dot + 1);

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(resolveSessionSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = Uint8Array.from(
      (sigHex.match(/.{2}/g) ?? []).map(h => parseInt(h, 16)),
    );

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
    if (!valid) return null;

    const session = JSON.parse(atob(data));
    if (Date.now() - session.createdAt > SESSION_MAX_AGE * 1000) return null;

    return session.role as string;
  } catch {
    return null;
  }
}

// ─── NONCE GENERATION ────────────────────────────────────────────────────────

function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

// ─── MAIN MIDDLEWARE ─────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CORS preflight (OPTIONS) ───────────────────────────────────────────────

  if (request.method === 'OPTIONS') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'null';
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  appUrl,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age':       '86400',
      },
    });
  }

  // ── Session ────────────────────────────────────────────────────────────────
  const val  = request.cookies.get(COOKIE_NAME)?.value;
  const role = val ? await getRole(val) : null;

  // ── Nonce + CSP ───────────────────────────────────────────────────────────

  const nonce = generateNonce();

  // Forward nonce to server components (read in layout.tsx via next/headers).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // ── Route guards ──────────────────────────────────────────────────────────

  // Already logged in → skip login pages
  if (pathname === '/player-login'      && role === 'player')
    return redirectWithSecurity(new URL('/dashboard', request.url), nonce);
  if (pathname === '/facilitator-login' && role === 'facilitator')
    return redirectWithSecurity(new URL('/facilitator', request.url), nonce);
  if (pathname === '/admin-login'       && role === 'admin')
    return redirectWithSecurity(new URL('/admin', request.url), nonce);

  // Player dashboard
  if (pathname === '/' || pathname === '/dashboard') {
    if (role !== 'player')
      return redirectWithSecurity(new URL('/player-login', request.url), nonce);
  }

  // Facilitator dashboard
  if (pathname.startsWith('/facilitator') && pathname !== '/facilitator-login') {
    if (role !== 'facilitator')
      return redirectWithSecurity(new URL('/facilitator-login', request.url), nonce);
  }

  // Admin panel
  if (pathname.startsWith('/admin') && pathname !== '/admin-login') {
    if (role !== 'admin')
      return redirectWithSecurity(new URL('/admin-login', request.url), nonce);
  }

  // ── Pass request through with nonce headers ───────────────────────────────
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  applySecurityHeaders(response, nonce);
  return response;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Apply the full set of security headers including the nonce-based CSP. */
function applySecurityHeaders(response: NextResponse, nonce: string): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
}

/** Redirect with full security headers applied (so CSP is present on the 3xx). */
function redirectWithSecurity(destination: URL, nonce: string): NextResponse {
  const response = NextResponse.redirect(destination);
  applySecurityHeaders(response, nonce);
  return response;
}

// ─── MATCHER ─────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/facilitator',
    '/facilitator/:path*',
    '/admin',
    '/admin/:path*',
    '/player-login',
    '/facilitator-login',
    '/admin-login',
    '/api/:path*',
  ],
};
