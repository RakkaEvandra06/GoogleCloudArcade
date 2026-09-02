import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

// Import locally for use inside this file, and re-export so callers that
// do `import { COOKIE_NAME } from '@/lib/session'` keep working without changes.
import { COOKIE_NAME, SESSION_MAX_AGE } from './session-constants';
export { COOKIE_NAME, SESSION_MAX_AGE };

export interface ArcadeSession {
    role: 'player' | 'facilitator' | 'admin';
  /* Player */
    participantId?: string;
    participantName?: string;
    profileUrl?: string;
  /* Facilitator */
    facCode?: string;
    facName?: string;
  /* Timestamp */
    createdAt: number;
}

const SECRET_FALLBACK = 'change-this-default-secret-in-production';

function secret(): string {
  const s = process.env.SESSION_SECRET;
  const isPlaceholder =
    !s ||
    s.includes('change-this') ||
    s.includes('your-random') ||
    s.includes('placeholder') ||
    s.includes('secret-here');
  return isPlaceholder ? SECRET_FALLBACK : s;
}

function sign(data: string): string {
    return createHmac('sha256', secret()).update(data).digest('hex');
}

export function encodeSession(session: ArcadeSession): string {
    const data = Buffer.from(JSON.stringify(session)).toString('base64');
    return `${data}.${sign(data)}`;
}

export function decodeSession(cookieValue: string): ArcadeSession | null {
    try {
    const dot = cookieValue.lastIndexOf('.');
    if (dot < 0) return null;
    const data        = cookieValue.slice(0, dot);
    const sig         = cookieValue.slice(dot + 1);
    const expectedSig = sign(data);
    // Constant-time comparison to prevent timing attacks (CWE-208)
    const sigBuf      = Buffer.from(sig,         'hex');
    const expBuf      = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const session: ArcadeSession = JSON.parse(Buffer.from(data, 'base64').toString());
    if (Date.now() - session.createdAt > SESSION_MAX_AGE * 1000) return null;
    return session;
    } catch { return null; }
}

/** Read the session from the incoming request cookies (server components / API routes). */
export async function getSession(): Promise<ArcadeSession | null> {
    const store = await cookies();
    const c = store.get(COOKIE_NAME);
    return c ? decodeSession(c.value) : null;
}

/** Write a session cookie to a NextResponse (call this in API route handlers). */
export function writeSessionCookie(res: NextResponse, session: Omit<ArcadeSession, 'createdAt'>): NextResponse {
    const full: ArcadeSession = { ...session, createdAt: Date.now() };
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set(COOKIE_NAME, encodeSession(full), {
      httpOnly: true,
      secure:   isProd,                   // HTTPS-only in production
      sameSite: isProd ? 'strict' : 'lax',// Strict CSRF protection in prod
      maxAge:   SESSION_MAX_AGE,
      path:     '/',
    });
    return res;
}

/** Clear the session cookie. */
export function clearSessionCookie(res: NextResponse): NextResponse {
    res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return res;
}

/** Read + verify session from a raw NextRequest (used in Edge middleware). */
export function readSessionFromRequest(req: NextRequest): ArcadeSession | null {
    const val = req.cookies.get(COOKIE_NAME)?.value;
    return val ? decodeSession(val) : null;
}
