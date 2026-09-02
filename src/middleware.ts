import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/session-constants';

function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  const FALLBACK = 'change-this-default-secret-in-production';
  const isPlaceholder =
    !s ||
    s.length < 32 ||
    s.includes('change-this') ||
    s.includes('your-random') ||
    s.includes('placeholder') ||
    s.includes('secret-here');
  if (isPlaceholder) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[middleware] SESSION_SECRET is not set or uses a placeholder. ' +
        'Generate one with: openssl rand -base64 32',
      );
    }
    // Return the same fallback used by session.ts so cookies can be verified
    return FALLBACK;
  }
  return s;
}

async function getRole(cookieValue: string): Promise<string | null> {
  try {
    const dot = cookieValue.lastIndexOf('.');
    if (dot < 0) return null;
    const data   = cookieValue.slice(0, dot);
    const sigHex = cookieValue.slice(dot + 1);

    const enc  = new TextEncoder();
    const key  = await crypto.subtle.importKey(
      'raw',
      enc.encode(getSessionSecret()),  // FIX: no insecure fallback
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
  } catch { return null; }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const val  = request.cookies.get(COOKIE_NAME)?.value;
  const role = val ? await getRole(val) : null;

  // ── Already logged in → skip login pages ──────────────────
  if (pathname === '/player-login' && role === 'player')
    return NextResponse.redirect(new URL('/dashboard', request.url));
  if (pathname === '/facilitator-login' && role === 'facilitator')
    return NextResponse.redirect(new URL('/facilitator', request.url));
  if (pathname === '/admin-login' && role === 'admin')
    return NextResponse.redirect(new URL('/admin', request.url));

  // ── Player dashboard ───────────────────────────────────────
  if (pathname === '/' || pathname === '/dashboard') {
    if (role !== 'player')
      return NextResponse.redirect(new URL('/player-login', request.url));
  }

  // ── Facilitator dashboard ──────────────────────────────────
  if (pathname.startsWith('/facilitator') && pathname !== '/facilitator-login') {
    if (role !== 'facilitator')
      return NextResponse.redirect(new URL('/facilitator-login', request.url));
  }

  // ── Admin panel ────────────────────────────────────────────
  if (pathname.startsWith('/admin') && pathname !== '/admin-login') {
    if (role !== 'admin')
      return NextResponse.redirect(new URL('/admin-login', request.url));
  }

  return NextResponse.next();
}

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
  ],
};