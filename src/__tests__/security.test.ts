/**
 * Tests for src/lib/security.ts
 *
 * Added in this refactor (September 2026):
 *   C-2  — assertAdminSecret() throws for short secrets in ALL environments
 *   M-4  — readBoundedJson() rejects oversized bodies and invalid JSON
 *   M-9  — parsePosInt() never returns NaN; returns fallback for bad input
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(process.env as any).NODE_ENV = 'test';

import {
  validateProfileUrl,
  validateScrapeUrl,
  validateOrigin,
  validateAvatarUrl,
  escapeHtml,
  safeCompare,
  checkRateLimit,
  sanitizeString,
  validateUUID,
  getClientIP,
  isValidEmail,
  buildCsp,
  assertAdminSecret,
  parsePosInt,
  readBoundedJson,
  MAX_BODY_BYTES,
} from '../lib/security';

// ─── validateProfileUrl ───────────────────────────────────────────────────────

describe('validateProfileUrl', () => {
  it('accepts a canonical skills.google public-profile URL', () => {
    expect(validateProfileUrl('https://www.skills.google/public_profiles/abc-123').ok).toBe(true);
  });

  it('accepts the legacy cloudskillsboost.google.com hostname', () => {
    expect(validateProfileUrl('https://cloudskillsboost.google.com/public_profiles/abc').ok).toBe(true);
  });

  it('rejects non-HTTPS URLs', () => {
    const r = validateProfileUrl('http://www.skills.google/public_profiles/x');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/HTTPS/i);
  });

  it('rejects an arbitrary external host', () => {
    expect(validateProfileUrl('https://evil.com/public_profiles/x').ok).toBe(false);
  });

  it('rejects internal IP addresses', () => {
    expect(validateProfileUrl('https://192.168.1.1/public_profiles/x').ok).toBe(false);
  });

  it('rejects localhost', () => {
    expect(validateProfileUrl('https://localhost/public_profiles/x').ok).toBe(false);
  });

  it('rejects a URL without the /public_profiles/ path segment', () => {
    expect(validateProfileUrl('https://www.skills.google/courses/123').ok).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validateProfileUrl('').ok).toBe(false);
  });

  it('rejects a non-URL string', () => {
    expect(validateProfileUrl('not-a-url').ok).toBe(false);
  });
});

// ─── validateScrapeUrl ───────────────────────────────────────────────────────

describe('validateScrapeUrl — query strings and fragments must be rejected', () => {
  const VALID = 'https://www.skills.google/public_profiles/abc123';

  it('accepts a clean profile URL with no query string or fragment', () => {
    expect(validateScrapeUrl(VALID).ok).toBe(true);
  });

  it('rejects a URL with a query string', () => {
    const r = validateScrapeUrl(`${VALID}?foo=bar&inject=<script>`);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/query/i);
  });

  it('rejects a URL with only a fragment', () => {
    const r = validateScrapeUrl(`${VALID}#section`);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/fragment/i);
  });

  it('rejects a URL with both a query string and a fragment', () => {
    const r = validateScrapeUrl(`${VALID}?q=1#frag`);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/query/i);
  });

  it('rejects disallowed hosts even without query strings', () => {
    expect(validateScrapeUrl('https://evil.com/public_profiles/x').ok).toBe(false);
  });
});

// ─── validateOrigin ───────────────────────────────────────────────────────────

describe('validateOrigin — fail-closed without APP_URL in production', () => {
  const makeReq = (origin?: string, referer?: string) => {
    const headers = new Headers();
    if (origin)  headers.set('origin',  origin);
    if (referer) headers.set('referer', referer);
    return { headers } as unknown as Request;
  };

  const origNodeEnv = process.env.NODE_ENV;
  const origAppUrl  = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = origNodeEnv;
    if (origAppUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = origAppUrl;
    else delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('returns false in production when NEXT_PUBLIC_APP_URL is not set', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(validateOrigin(makeReq('https://attacker.com'))).toBe(false);
  });

  it('returns true for a same-origin request when APP_URL is set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://arcadetrack.app';
    expect(validateOrigin(makeReq('https://arcadetrack.app'))).toBe(true);
  });

  it('returns false for a cross-origin request when APP_URL is set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://arcadetrack.app';
    expect(validateOrigin(makeReq('https://attacker.com'))).toBe(false);
  });

  it('returns false when referer is from a different origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://arcadetrack.app';
    expect(validateOrigin(makeReq(undefined, 'https://evil.com/csrf'))).toBe(false);
  });
});

// ─── validateAvatarUrl ───────────────────────────────────────────────────────

describe('validateAvatarUrl — CDN allowlist', () => {
  it('accepts lh3.googleusercontent.com', () => {
    expect(validateAvatarUrl('https://lh3.googleusercontent.com/a/img.jpg'))
      .toBe('https://lh3.googleusercontent.com/a/img.jpg');
  });

  it('accepts cdn.qwiklabs.com', () => {
    expect(validateAvatarUrl('https://cdn.qwiklabs.com/badge.png'))
      .toBe('https://cdn.qwiklabs.com/badge.png');
  });

  it('normalises protocol-relative URLs to https:', () => {
    expect(validateAvatarUrl('//cdn.qwiklabs.com/img.png'))
      .toBe('https://cdn.qwiklabs.com/img.png');
  });

  it('rejects an arbitrary external domain', () => {
    expect(validateAvatarUrl('https://attacker.com/track.gif')).toBe('');
  });

  it('rejects http (non-HTTPS) URLs', () => {
    expect(validateAvatarUrl('http://cdn.qwiklabs.com/img.png')).toBe('');
  });

  it('returns empty string for an empty input', () => {
    expect(validateAvatarUrl('')).toBe('');
  });
});

// ─── escapeHtml ───────────────────────────────────────────────────────────────

describe('escapeHtml — prevent XSS in email HTML', () => {
  it('escapes < and >', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes & before other entities to avoid double-escaping', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

// ─── safeCompare ─────────────────────────────────────────────────────────────

describe('safeCompare', () => {
  it('returns true for identical strings', () => {
    expect(safeCompare('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of the same length', () => {
    expect(safeCompare('abc123', 'abc124')).toBe(false);
  });

  it('returns false for strings of different lengths', () => {
    expect(safeCompare('short', 'much-longer-string')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(safeCompare('', '')).toBe(true);
  });
});

// ─── sanitizeString ──────────────────────────────────────────────────────────

describe('sanitizeString', () => {
  it('strips control characters', () => {
    expect(sanitizeString('\x00hello\x1F')).toBe('hello');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('truncates to maxLength', () => {
    expect(sanitizeString('abcdef', 3)).toBe('abc');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeString(42 as unknown as string)).toBe('');
  });
});

// ─── validateUUID ─────────────────────────────────────────────────────────────

describe('validateUUID', () => {
  it('accepts a valid v4 UUID', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    expect(validateUUID('not-a-uuid')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validateUUID('')).toBe(false);
  });

  it('rejects a non-string', () => {
    expect(validateUUID(12345)).toBe(false);
  });
});

// ─── checkRateLimit ──────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const key = `test-rl-${Date.now()}-allow`;
    expect(checkRateLimit(key, 3, 60)).toBe(true);
    expect(checkRateLimit(key, 3, 60)).toBe(true);
    expect(checkRateLimit(key, 3, 60)).toBe(true);
  });

  it('blocks the (limit+1)th request', () => {
    const key = `test-rl-${Date.now()}-block`;
    checkRateLimit(key, 2, 60);
    checkRateLimit(key, 2, 60);
    expect(checkRateLimit(key, 2, 60)).toBe(false);
  });

  it('uses separate buckets for different keys', () => {
    const key1 = `test-rl-${Date.now()}-a`;
    const key2 = `test-rl-${Date.now()}-b`;
    checkRateLimit(key1, 1, 60);
    checkRateLimit(key1, 1, 60); // exhausted
    expect(checkRateLimit(key2, 1, 60)).toBe(true); // independent
  });
});

// ─── getClientIP ─────────────────────────────────────────────────────────────

describe('getClientIP — trusted IP extraction', () => {
  function makeReq(headers: Record<string, string>): Request {
    return new Request('https://example.com/', { headers });
  }

  const origCfZone = process.env.CF_ZONE_ID;
  afterEach(() => {
    if (origCfZone !== undefined) process.env.CF_ZONE_ID = origCfZone;
    else delete process.env.CF_ZONE_ID;
  });

  it('prefers x-vercel-forwarded-for over all other headers', () => {
    const req = makeReq({
      'x-vercel-forwarded-for': '1.2.3.4',
      'x-forwarded-for':        '9.9.9.9, 8.8.8.8',
      'cf-connecting-ip':       '5.5.5.5',
    });
    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('trusts cf-connecting-ip when CF_ZONE_ID is configured', () => {
    process.env.CF_ZONE_ID = 'some-zone-id';
    const req = makeReq({ 'cf-connecting-ip': '5.5.5.5', 'x-forwarded-for': '9.9.9.9' });
    expect(getClientIP(req)).toBe('5.5.5.5');
  });

  it('uses the RIGHTMOST XFF entry (nearest trusted proxy)', () => {
    delete process.env.CF_ZONE_ID;
    const req = makeReq({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' });
    expect(getClientIP(req)).toBe('3.3.3.3');
  });

  it('a spoofed leftmost XFF entry does NOT bypass extraction', () => {
    delete process.env.CF_ZONE_ID;
    const req = makeReq({ 'x-forwarded-for': '127.0.0.1, 203.0.113.42' });
    expect(getClientIP(req)).toBe('203.0.113.42');
    expect(getClientIP(req)).not.toBe('127.0.0.1');
  });

  it('returns "unknown" when no IP header is present', () => {
    delete process.env.CF_ZONE_ID;
    expect(getClientIP(makeReq({}))).toBe('unknown');
  });
});

// ─── isValidEmail ─────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('accepts a standard email address', () => {
    expect(isValidEmail('user@example.org')).toBe(true);
  });

  it('rejects a placeholder @example.com address', () => {
    expect(isValidEmail('someone@example.com')).toBe(false);
  });

  it('rejects an address without @', () => {
    expect(isValidEmail('notanemail')).toBe(false);
  });

  it('rejects a non-string value', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });

  it('rejects an address longer than 254 characters', () => {
    const long = 'a'.repeat(250) + '@b.co';
    expect(isValidEmail(long)).toBe(false);
  });
});

// ─── buildCsp ─────────────────────────────────────────────────────────────────

describe('buildCsp — nonce-based CSP', () => {
  const nonce = 'dGVzdG5vbmNl';

  it('includes the nonce in script-src', () => {
    expect(buildCsp(nonce)).toContain(`'nonce-${nonce}'`);
  });

  it('does NOT contain unsafe-inline in script-src', () => {
    const csp       = buildCsp(nonce);
    const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'));
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('includes frame-ancestors: none to prevent clickjacking', () => {
    expect(buildCsp(nonce)).toContain("frame-ancestors 'none'");
  });
});

// ─── assertAdminSecret (C-2 FIX) ─────────────────────────────────────────────

describe('[C-2] assertAdminSecret — throws for weak secrets in ALL environments', () => {
  const origSecret  = process.env.ADMIN_SECRET;
  const origNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (origSecret !== undefined) process.env.ADMIN_SECRET = origSecret;
    else delete process.env.ADMIN_SECRET;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = origNodeEnv;
  });

  it('[C-2] throws when ADMIN_SECRET is missing', () => {
    delete process.env.ADMIN_SECRET;
    expect(() => assertAdminSecret()).toThrow();
  });

  it('[C-2] throws when ADMIN_SECRET is shorter than 24 chars', () => {
    process.env.ADMIN_SECRET = 'short';
    expect(() => assertAdminSecret()).toThrow(/24/);
  });

  it('[C-2] throws even in development mode for a short secret', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = 'development';
    process.env.ADMIN_SECRET = 'Evandra06'; // 9 chars — the original bad value
    expect(() => assertAdminSecret()).toThrow();
  });

  it('[C-2] throws when the secret looks like a placeholder', () => {
    process.env.ADMIN_SECRET = 'replace-with-your-secret-here!!';
    expect(() => assertAdminSecret()).toThrow();
  });

  it('[C-2] returns the secret when it meets all requirements', () => {
    const good = 'A1B2C3D4E5F6G7H8I9J0K1L2';
    process.env.ADMIN_SECRET = good; // 24 chars
    expect(assertAdminSecret()).toBe(good);
  });
});

// ─── parsePosInt (M-9 FIX) ───────────────────────────────────────────────────

describe('[M-9] parsePosInt — never returns NaN', () => {
  it('[M-9] returns the parsed value for a valid integer string', () => {
    expect(parsePosInt('42', 10, 100)).toBe(42);
  });

  it('[M-9] returns the fallback for a non-numeric string', () => {
    expect(parsePosInt('abc', 10, 100)).toBe(10);
  });

  it('[M-9] returns the fallback for an empty string', () => {
    expect(parsePosInt('', 10, 100)).toBe(10);
  });

  it('[M-9] returns the fallback for null', () => {
    expect(parsePosInt(null, 50, 100)).toBe(50);
  });

  it('[M-9] returns the fallback for undefined', () => {
    expect(parsePosInt(undefined, 50, 100)).toBe(50);
  });

  it('[M-9] clamps to max when the value exceeds the ceiling', () => {
    expect(parsePosInt('9999', 10, 100)).toBe(100);
  });

  it('[M-9] returns 0 for "0" (valid non-negative integer)', () => {
    expect(parsePosInt('0', 10, 100)).toBe(0);
  });

  it('[M-9] returns the fallback for a negative number', () => {
    expect(parsePosInt('-5', 10, 100)).toBe(10);
  });

  it('[M-9] result is always a finite number — never NaN', () => {
    for (const input of ['abc', '', null, undefined, '-1', 'NaN', '1e5']) {
      const result = parsePosInt(input, 0, 100);
      expect(Number.isFinite(result)).toBe(true);
    }
  });
});

// ─── readBoundedJson (M-4 FIX) ───────────────────────────────────────────────

describe('[M-4] readBoundedJson — enforces MAX_BODY_BYTES', () => {
  function makeReq(body: string, contentLength?: number): Request {
    const headers = new Headers({ 'content-type': 'application/json' });
    if (contentLength !== undefined) headers.set('content-length', String(contentLength));
    return new Request('https://example.com/', { method: 'POST', headers, body });
  }

  it('[M-4] parses valid JSON within the size limit', async () => {
    const body = JSON.stringify({ foo: 'bar' });
    const result = await readBoundedJson(makeReq(body));
    expect(result).toEqual({ foo: 'bar' });
  });

  it('[M-4] returns null for invalid JSON', async () => {
    const result = await readBoundedJson(makeReq('not-json'));
    expect(result).toBeNull();
  });

  it('[M-4] returns null when Content-Length exceeds MAX_BODY_BYTES', async () => {
    const result = await readBoundedJson(
      makeReq('{}', MAX_BODY_BYTES + 1),
    );
    expect(result).toBeNull();
  });

  it('[M-4] returns null for a JSON array (not an object)', async () => {
    const result = await readBoundedJson(makeReq(JSON.stringify([1, 2, 3])));
    expect(result).toBeNull();
  });

  it('[M-4] returns null for a JSON primitive (not an object)', async () => {
    const result = await readBoundedJson(makeReq(JSON.stringify('hello')));
    expect(result).toBeNull();
  });

  it('[M-4] returns null for an empty body', async () => {
    const result = await readBoundedJson(makeReq(''));
    expect(result).toBeNull();
  });
});
