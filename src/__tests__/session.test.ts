/**
 * Tests for src/lib/session.ts
 *
 * Covers:
 *   • [C-2] encodeSession / decodeSession throw when SESSION_SECRET is missing
 *     or a placeholder, instead of falling back to a published default value
 *   • Successful round-trip: encode → decode returns the original session
 *   • Tampered payload returns null (integrity check)
 *   • Tampered signature returns null
 *   • Expired session returns null
 *   • Completely malformed cookie strings return null
 */

const origEnv = process.env.SESSION_SECRET;

afterAll(() => {
  if (origEnv !== undefined) process.env.SESSION_SECRET = origEnv;
  else delete process.env.SESSION_SECRET;
});

// Helper to set a valid 32-char secret and import fresh module each time.
async function loadSession(secret?: string) {
  if (secret !== undefined) process.env.SESSION_SECRET = secret;
  else delete process.env.SESSION_SECRET;
  // Force Jest to re-evaluate the module so the secret() closure re-runs.
  jest.resetModules();
  return import('../lib/session');
}

const VALID_SECRET = 'a'.repeat(32); // 32 chars, no placeholder fragments
const GOOD_SESSION = { role: 'player' as const, participantId: 'u-1', profileUrl: 'https://x.com' };

// ─── [C-2] Throw on missing / placeholder secret ─────────────────────────────

describe('[C-2] encodeSession throws when SESSION_SECRET is invalid', () => {
  it('throws when SESSION_SECRET is absent', async () => {
    const { encodeSession } = await loadSession(undefined);
    expect(() => encodeSession({ ...GOOD_SESSION, createdAt: Date.now() })).toThrow(
      /SESSION_SECRET/i,
    );
  });

  it('throws when SESSION_SECRET is too short (< 32 chars)', async () => {
    const { encodeSession } = await loadSession('short');
    expect(() => encodeSession({ ...GOOD_SESSION, createdAt: Date.now() })).toThrow(
      /SESSION_SECRET/i,
    );
  });

  it('throws when SESSION_SECRET contains a placeholder fragment', async () => {
    const { encodeSession } = await loadSession('change-this-to-something-random-please!');
    expect(() => encodeSession({ ...GOOD_SESSION, createdAt: Date.now() })).toThrow(
      /SESSION_SECRET/i,
    );
  });

  it('throws for the exact original fallback string used in the codebase', async () => {
    const { encodeSession } = await loadSession('change-this-default-secret-in-production');
    expect(() => encodeSession({ ...GOOD_SESSION, createdAt: Date.now() })).toThrow();
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('encodeSession / decodeSession round-trip', () => {
  it('decodes an encoded player session successfully', async () => {
    const { encodeSession, decodeSession } = await loadSession(VALID_SECRET);
    const payload = { ...GOOD_SESSION, createdAt: Date.now() };
    const token   = encodeSession(payload);
    const decoded = decodeSession(token);
    expect(decoded?.role).toBe('player');
    expect(decoded?.participantId).toBe('u-1');
  });

  it('decodes an admin session successfully', async () => {
    const { encodeSession, decodeSession } = await loadSession(VALID_SECRET);
    const token   = encodeSession({ role: 'admin', createdAt: Date.now() });
    const decoded = decodeSession(token);
    expect(decoded?.role).toBe('admin');
  });

  it('decodes a facilitator session successfully', async () => {
    const { encodeSession, decodeSession } = await loadSession(VALID_SECRET);
    const token   = encodeSession({ role: 'facilitator', facCode: 'CODE1', createdAt: Date.now() });
    const decoded = decodeSession(token);
    expect(decoded?.role).toBe('facilitator');
    expect(decoded?.facCode).toBe('CODE1');
  });
});

// ─── Integrity checks ─────────────────────────────────────────────────────────

describe('decodeSession integrity checks', () => {
  it('returns null for a tampered payload', async () => {
    const { encodeSession, decodeSession } = await loadSession(VALID_SECRET);
    const token   = encodeSession({ role: 'player', createdAt: Date.now() });
    // Swap the data portion with a different base64 payload.
    const [, sig] = [token.slice(0, token.lastIndexOf('.')), token.slice(token.lastIndexOf('.') + 1)];
    const fakeData = Buffer.from(JSON.stringify({ role: 'admin', createdAt: Date.now() })).toString('base64');
    expect(decodeSession(`${fakeData}.${sig}`)).toBeNull();
  });

  it('returns null for a tampered signature', async () => {
    const { encodeSession, decodeSession } = await loadSession(VALID_SECRET);
    const token = encodeSession({ role: 'player', createdAt: Date.now() });
    const data  = token.slice(0, token.lastIndexOf('.'));
    expect(decodeSession(`${data}.deadbeef`)).toBeNull();
  });

  it('returns null for a cookie with no dot separator', async () => {
    const { decodeSession } = await loadSession(VALID_SECRET);
    expect(decodeSession('nodot')).toBeNull();
  });

  it('returns null for a completely empty string', async () => {
    const { decodeSession } = await loadSession(VALID_SECRET);
    expect(decodeSession('')).toBeNull();
  });

  it('returns null for a random string', async () => {
    const { decodeSession } = await loadSession(VALID_SECRET);
    expect(decodeSession('random.garbage.here')).toBeNull();
  });
});

// ─── Expiry check ─────────────────────────────────────────────────────────────

describe('decodeSession expiry', () => {
  it('returns null for a session created more than 7 days ago', async () => {
    const { encodeSession, decodeSession } = await loadSession(VALID_SECRET);
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1_000;
    const token        = encodeSession({ role: 'player', createdAt: eightDaysAgo });
    expect(decodeSession(token)).toBeNull();
  });

  it('accepts a session created moments ago', async () => {
    const { encodeSession, decodeSession } = await loadSession(VALID_SECRET);
    const token = encodeSession({ role: 'player', createdAt: Date.now() - 1_000 });
    expect(decodeSession(token)).not.toBeNull();
  });
});
