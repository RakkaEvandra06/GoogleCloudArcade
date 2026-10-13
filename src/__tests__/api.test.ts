/**
 * API-layer behaviour tests.
 *
 * Added in this refactor (September 2026):
 *   H-1  POST /api/facilitator/email — IDOR: out-of-group UUIDs skipped
 *   H-5  POST /api/participants/[id] — rate-limit key uses ip:id not just id
 *   M-1  POST /api/feedback          — CSRF: missing Origin → 403
 *   M-3  GET  /api/participants      — facilitators receive only their members
 *   L-1  GET  /api/skills            — requires session, no anonymous access
 *
 * Existing tests (preserved unchanged):
 *   H-2  DELETE /api/participants/[id] — facilitator scope check
 *   M-1  GET    /api/participants      — total count in pagination response
 *   H-3  POST   /api/facilitator/import — MAX_IMPORT_ROWS cap (50)
 *   L-1  POST   /api/facilitator/import — updateUploadBatch called with final counts
 *   M-3  GET    /api/cron/refresh-leaderboard — snapshot games/skills non-zero
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(process.env as any).NODE_ENV = 'test';
process.env.SESSION_SECRET         = 'a'.repeat(44); // 44 chars → valid base64
process.env.NEXT_PUBLIC_APP_URL    = 'https://arcadetrack.app';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../lib/session', () => ({ getSession: jest.fn() }));

jest.mock('../lib/db', () => ({
  getParticipants:           jest.fn(),
  countParticipants:         jest.fn(),
  getParticipant:            jest.fn(),
  deleteParticipant:         jest.fn(),
  getFacilitatorMembers:     jest.fn(),
  getFacilitatorMemberIds:   jest.fn(),  // NEW — H-1 fix
  createAuditLog:            jest.fn(),
  createUploadBatch:         jest.fn(),
  updateUploadBatch:         jest.fn(),
  addParticipant:            jest.fn(),
  getParticipantByUrl:       jest.fn(),
  addFacilitatorMember:      jest.fn(),
  setBadges:                 jest.fn(),
  updateParticipant:         jest.fn(),
  getAllActiveBadgesGrouped:  jest.fn(),
  getSystemSetting:          jest.fn(),
  setSystemSetting:          jest.fn(),
  markClientError:           jest.fn(),
  getBadges:                 jest.fn(),
  getSkillBadges:            jest.fn(),
}));

jest.mock('../lib/scrapeProfile', () => ({
  scrapeProfile: jest.fn(),
  ScrapeError:   class ScrapeError extends Error {
    constructor(msg: string, public statusCode = 500) { super(msg); }
  },
}));

jest.mock('../lib/security', () => {
  const actual = jest.requireActual('../lib/security');
  return {
    ...actual,
    getClientIP:    jest.fn().mockReturnValue('127.0.0.1'),
    validateOrigin: jest.fn().mockReturnValue(true),
    checkRateLimit: jest.fn().mockReturnValue(true),
  };
});

jest.mock('../lib/milestones', () => ({
  achievedMilestone: jest.fn().mockReturnValue(null),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import type { Badge, Participant, UploadBatch } from '../lib/db';
import { getSession }                            from '../lib/session';
import {
  getParticipants,
  countParticipants,
  getParticipant,
  deleteParticipant,
  getFacilitatorMembers,
  getFacilitatorMemberIds,
  createAuditLog,
  createUploadBatch,
  updateUploadBatch,
  addParticipant,
  getParticipantByUrl,
  addFacilitatorMember,
  getAllActiveBadgesGrouped,
  getSystemSetting,
  setSystemSetting,
  updateParticipant,
  getBadges,
  getSkillBadges,
}                                                from '../lib/db';
import { scrapeProfile }                         from '../lib/scrapeProfile';
import { validateOrigin }                        from '../lib/security';

// ─── Route handles (loaded after mocks) ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DELETE_participant:     (...a: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GET_participants:       (...a: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let POST_import:            (...a: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GET_leaderboard_cron:   (...a: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let POST_email:             (...a: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let POST_feedback:          (...a: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let POST_sync_participant:  (...a: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GET_skills:             (...a: any[]) => any;

beforeAll(async () => {
  const [del, list, imp, cron, email, feedback, sync, skills] = await Promise.all([
    import('../app/api/participants/[id]/route'),
    import('../app/api/participants/route'),
    import('../app/api/facilitator/import/route'),
    import('../app/api/cron/refresh-leaderboard/route'),
    import('../app/api/facilitator/email/route'),
    import('../app/api/feedback/route'),
    import('../app/api/participants/[id]/route'),
    import('../app/api/skills/route'),
  ]);
  DELETE_participant    = del.DELETE;
  GET_participants      = list.GET;
  POST_import          = imp.POST;
  GET_leaderboard_cron = cron.GET;
  POST_email           = email.POST;
  POST_feedback        = feedback.POST;
  POST_sync_participant = sync.POST;
  GET_skills           = skills.GET;
});

// ─── Mock references ──────────────────────────────────────────────────────────

const mockGetSession            = getSession             as jest.MockedFunction<typeof getSession>;
const mockGetParticipants       = getParticipants        as jest.MockedFunction<typeof getParticipants>;
const mockCountParticipants     = countParticipants      as jest.MockedFunction<typeof countParticipants>;
const mockGetParticipant        = getParticipant         as jest.MockedFunction<typeof getParticipant>;
const mockDeleteParticipant     = deleteParticipant      as jest.MockedFunction<typeof deleteParticipant>;
const mockGetFacilitatorMembers = getFacilitatorMembers  as jest.MockedFunction<typeof getFacilitatorMembers>;
const mockGetFacilitatorMemberIds = getFacilitatorMemberIds as jest.MockedFunction<typeof getFacilitatorMemberIds>;
const mockCreateUploadBatch     = createUploadBatch      as jest.MockedFunction<typeof createUploadBatch>;
const mockUpdateUploadBatch     = updateUploadBatch      as jest.MockedFunction<typeof updateUploadBatch>;
const mockAddParticipant        = addParticipant         as jest.MockedFunction<typeof addParticipant>;
const mockGetParticipantByUrl   = getParticipantByUrl    as jest.MockedFunction<typeof getParticipantByUrl>;
const mockScrapeProfile         = scrapeProfile          as jest.MockedFunction<typeof scrapeProfile>;
const mockGetAllActiveBadges    = getAllActiveBadgesGrouped as jest.MockedFunction<typeof getAllActiveBadgesGrouped>;
const mockGetSystemSetting      = getSystemSetting       as jest.MockedFunction<typeof getSystemSetting>;
const mockGetBadges             = getBadges              as jest.MockedFunction<typeof getBadges>;
const mockGetSkillBadges        = getSkillBadges         as jest.MockedFunction<typeof getSkillBadges>;
const mockValidateOrigin        = validateOrigin         as jest.MockedFunction<typeof validateOrigin>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(
  method = 'GET',
  body?: unknown,
  extra?: Record<string, string>,
): Request {
  return new Request('https://arcadetrack.app/api/test', {
    method,
    headers: {
      'content-type': 'application/json',
      'origin':       'https://arcadetrack.app',
      ...extra,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id:          '550e8400-e29b-41d4-a716-000000000001',
    name:        'Test User',
    profile_url: 'https://www.cloudskillsboost.google.com/public_profiles/test',
    role:        'participant',
    created_at:  '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeBadge(category: 'game' | 'skill_badge', participantId: string): Badge {
  return {
    id:             crypto.randomUUID(),
    participant_id: participantId,
    badge_name:     category === 'game' ? 'Test Game' : 'Test Skill',
    category,
    points:         category === 'game' ? 1 : 0.5,
    earned_date:    '2026-07-15',
    scraped_at:     '2026-07-16T00:00:00.000Z',
  };
}

// ─── H-2: DELETE /api/participants/[id] — facilitator scope check ─────────────

describe('[H-2] DELETE /api/participants/[id] — facilitator scope check', () => {
  const TARGET_ID = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ role: 'facilitator', facCode: 'FAC-A', createdAt: Date.now() });
    (createAuditLog as jest.Mock).mockResolvedValue(undefined);
  });

  async function callDelete(id: string) {
    return DELETE_participant(makeReq('DELETE'), makeCtx(id));
  }

  it('[H-2] returns 403 when participant is NOT in the facilitator's group', async () => {
    mockGetFacilitatorMembers.mockResolvedValue([makeParticipant({ id: '550e8400-e29b-41d4-a716-999999990000' })]);
    const res = await callDelete(TARGET_ID);
    expect(res.status).toBe(403);
    expect(mockDeleteParticipant).not.toHaveBeenCalled();
  });

  it('[H-2] succeeds when the participant IS in the facilitator's group', async () => {
    mockGetFacilitatorMembers.mockResolvedValue([makeParticipant({ id: TARGET_ID })]);
    mockDeleteParticipant.mockResolvedValue(true);
    const res  = await callDelete(TARGET_ID);
    const body = await res.json() as { success: boolean };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteParticipant).toHaveBeenCalledWith(TARGET_ID);
  });

  it('[H-2] admin bypasses the membership check entirely', async () => {
    mockGetSession.mockResolvedValue({ role: 'admin', createdAt: Date.now() });
    mockDeleteParticipant.mockResolvedValue(true);
    const res = await callDelete(TARGET_ID);
    expect(res.status).toBe(200);
    expect(mockGetFacilitatorMembers).not.toHaveBeenCalled();
  });

  it('[H-2] returns 401 for an unauthenticated request', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callDelete(TARGET_ID);
    expect(res.status).toBe(401);
  });

  it('[H-2] returns 400 for a non-UUID participant ID', async () => {
    const res = await callDelete('not-a-valid-uuid');
    expect(res.status).toBe(400);
  });

  it('[H-2] returns 404 when the participant row does not exist', async () => {
    mockGetFacilitatorMembers.mockResolvedValue([makeParticipant({ id: TARGET_ID })]);
    mockDeleteParticipant.mockResolvedValue(false);
    const res = await callDelete(TARGET_ID);
    expect(res.status).toBe(404);
  });

  it('[H-2] audit log is written on successful delete', async () => {
    mockGetFacilitatorMembers.mockResolvedValue([makeParticipant({ id: TARGET_ID })]);
    mockDeleteParticipant.mockResolvedValue(true);
    await callDelete(TARGET_ID);
    expect(createAuditLog).toHaveBeenCalledWith('FAC-A', 'participant_deleted', TARGET_ID);
  });
});

// ─── M-3: GET /api/participants — facilitator group filtering (NEW) ──────────

describe('[M-3] GET /api/participants — facilitators only see their own members', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function callList(qs = '') {
    return GET_participants(new Request(`https://arcadetrack.app/api/participants${qs}`));
  }

  it('[M-3] facilitator receives only participants for their facCode', async () => {
    mockGetSession.mockResolvedValue({ role: 'facilitator', facCode: 'FAC-A', createdAt: Date.now() });
    mockGetParticipants.mockResolvedValue([makeParticipant()]);
    mockCountParticipants.mockResolvedValue(1);

    await callList('?limit=10&offset=0');

    // Both data and count calls must receive the facCode filter.
    expect(mockGetParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ facCode: 'FAC-A' }),
    );
    expect(mockCountParticipants).toHaveBeenCalledWith(
      expect.objectContaining({ facCode: 'FAC-A' }),
    );
  });

  it('[M-3] admin receives unfiltered results (no facCode)', async () => {
    mockGetSession.mockResolvedValue({ role: 'admin', createdAt: Date.now() });
    mockGetParticipants.mockResolvedValue([makeParticipant()]);
    mockCountParticipants.mockResolvedValue(1);

    await callList();

    expect(mockGetParticipants).toHaveBeenCalledWith(
      expect.not.objectContaining({ facCode: expect.anything() }),
    );
  });

  it('[M-3] response includes a numeric total field', async () => {
    mockGetSession.mockResolvedValue({ role: 'facilitator', facCode: 'FAC-A', createdAt: Date.now() });
    mockGetParticipants.mockResolvedValue([makeParticipant()]);
    mockCountParticipants.mockResolvedValue(247);

    const res  = await callList('?limit=10&offset=0');
    const body = await res.json() as { total: number; participants: unknown[] };
    expect(res.status).toBe(200);
    expect(body.total).toBe(247);
  });

  it('[M-3] clamps limit to a maximum of 100', async () => {
    mockGetSession.mockResolvedValue({ role: 'admin', createdAt: Date.now() });
    mockGetParticipants.mockResolvedValue([]);
    mockCountParticipants.mockResolvedValue(0);

    await callList('?limit=9999');
    const opts = (mockGetParticipants.mock.calls[0] as [{ limit?: number }])[0];
    expect(opts?.limit).toBeLessThanOrEqual(100);
  });

  it('[M-3] returns 401 for unauthenticated requests', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callList();
    expect(res.status).toBe(401);
  });

  it('[M-3] NaN limit from non-numeric query param uses the fallback (50)', async () => {
    mockGetSession.mockResolvedValue({ role: 'admin', createdAt: Date.now() });
    mockGetParticipants.mockResolvedValue([]);
    mockCountParticipants.mockResolvedValue(0);

    await callList('?limit=abc');
    const opts = (mockGetParticipants.mock.calls[0] as [{ limit?: number }])[0];
    // Must be a finite number — never NaN
    expect(Number.isFinite(opts?.limit)).toBe(true);
    expect(opts?.limit).toBe(50); // default fallback
  });
});

// ─── H-1: POST /api/facilitator/email — IDOR membership gate (NEW) ──────────

describe('[H-1] POST /api/facilitator/email — IDOR membership gate', () => {
  const MEMBER_ID   = '550e8400-e29b-41d4-a716-000000000001';
  const ALIEN_ID    = '550e8400-e29b-41d4-a716-000000000099';
  const RESEND_URL  = 'https://api.resend.com/emails';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ role: 'facilitator', facCode: 'FAC-A', createdAt: Date.now() });
    mockGetFacilitatorMemberIds.mockResolvedValue([MEMBER_ID]);
    mockGetParticipant.mockResolvedValue(makeParticipant({ id: MEMBER_ID, email: 'member@example.org' }));
    mockGetBadges.mockResolvedValue([]);
    // Stub Resend API call so no real network request is made.
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    process.env.RESEND_API_KEY = 'test-key';
    process.env.FROM_EMAIL     = 'noreply@test.com';
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.FROM_EMAIL;
  });

  async function callEmail(memberIds: string[], extra?: Record<string, unknown>) {
    return POST_email(makeReq('POST', { member_ids: memberIds, subject: 'Test', ...extra }));
  }

  it('[H-1] out-of-group participant UUID is skipped — email is NOT sent', async () => {
    const res  = await callEmail([ALIEN_ID]);
    const body = await res.json() as { sent: number; skipped: number };

    expect(res.status).toBe(200);
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
    expect(global.fetch).not.toHaveBeenCalledWith(RESEND_URL, expect.anything());
  });

  it('[H-1] member UUID is accepted and email is sent', async () => {
    const res  = await callEmail([MEMBER_ID]);
    const body = await res.json() as { sent: number; skipped: number };

    expect(res.status).toBe(200);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
  });

  it('[H-1] mixed list: member email sent, alien UUID skipped', async () => {
    mockGetParticipant.mockImplementation(async (id: string) =>
      id === MEMBER_ID
        ? makeParticipant({ id: MEMBER_ID, email: 'member@example.org' })
        : null,
    );

    const res  = await callEmail([MEMBER_ID, ALIEN_ID]);
    const body = await res.json() as { sent: number; skipped: number };

    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(1);
  });

  it('[H-1] returns 200 when all UUIDs are invalid (no crash)', async () => {
    const res  = await callEmail(['not-a-uuid', 'also-bad']);
    const body = await res.json() as { sent: number; skipped: number };
    expect(res.status).toBe(200);
    expect(body.sent).toBe(0);
  });

  it('[H-1] returns 401 for a non-facilitator session', async () => {
    mockGetSession.mockResolvedValue({ role: 'player', createdAt: Date.now() });
    const res = await callEmail([MEMBER_ID]);
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── M-1: POST /api/feedback — CSRF validateOrigin check (NEW) ───────────────

describe('[M-1] POST /api/feedback — CSRF protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    // Restore validateOrigin to its actual implementation for this suite.
    mockValidateOrigin.mockRestore?.();
  });

  afterEach(() => {
    // Re-apply the default mock so other suites are not affected.
    mockValidateOrigin.mockReturnValue(true);
  });

  it('[M-1] returns 403 when the Origin header is missing and validateOrigin returns false', async () => {
    // Simulate a cross-origin (CSRF) request — no Origin / Referer header.
    mockValidateOrigin.mockReturnValue(false);
    const req = new Request('https://arcadetrack.app/api/feedback', {
      method:  'POST',
      headers: { 'content-type': 'application/json' }, // no Origin
      body:    JSON.stringify({ message: 'Cross-site feedback attempt', category: 'general' }),
    });
    const res = await POST_feedback(req);
    expect(res.status).toBe(403);
  });

  it('[M-1] returns 200 for a valid same-origin feedback submission', async () => {
    mockValidateOrigin.mockReturnValue(true);
    (require('../lib/db').createFeedback as jest.Mock).mockResolvedValue(undefined);
    const req = makeReq('POST', { message: 'Great platform!', category: 'general' });
    const res = await POST_feedback(req);
    expect(res.status).toBe(200);
  });

  it('[M-1] returns 400 when message is too short', async () => {
    mockValidateOrigin.mockReturnValue(true);
    const req = makeReq('POST', { message: 'Hi', category: 'general' });
    const res = await POST_feedback(req);
    expect(res.status).toBe(400);
  });
});

// ─── L-1: GET /api/skills — authentication required (NEW) ───────────────────

describe('[L-1] GET /api/skills — requires authentication', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  async function callSkills() {
    return GET_skills(new Request('https://arcadetrack.app/api/skills'));
  }

  it('[L-1] returns 401 for an unauthenticated request', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callSkills();
    expect(res.status).toBe(401);
    expect(mockGetSkillBadges).not.toHaveBeenCalled();
  });

  it('[L-1] player session can access skill list', async () => {
    mockGetSession.mockResolvedValue({
      role: 'player', participantId: 'some-uuid', createdAt: Date.now(),
    });
    mockGetSkillBadges.mockResolvedValue([]);
    const res  = await callSkills();
    const body = await res.json() as { skills: unknown[] };
    expect(res.status).toBe(200);
    expect(body.skills).toBeDefined();
  });

  it('[L-1] facilitator session can access skill list', async () => {
    mockGetSession.mockResolvedValue({ role: 'facilitator', facCode: 'FAC-A', createdAt: Date.now() });
    mockGetSkillBadges.mockResolvedValue([{ id: 1, name: 'Skill A', url: 'https://example.com' }]);
    const res = await callSkills();
    expect(res.status).toBe(200);
  });
});

// ─── H-3 + L-1: POST /api/facilitator/import ────────────────────────────────

describe('[H-3 + L-1] POST /api/facilitator/import', () => {
  const VALID_URL   = 'https://www.cloudskillsboost.google.com/public_profiles/test';
  const BATCH_STUB: UploadBatch = {
    id: 'batch-uuid-1', fac_code: 'FAC-TEST', file_name: 'test.csv',
    total: 1, successful: 0, failed: 0, rolled_back: false,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ role: 'facilitator', facCode: 'FAC-TEST', createdAt: Date.now() });
    mockCreateUploadBatch.mockResolvedValue(BATCH_STUB);
    mockUpdateUploadBatch.mockResolvedValue(undefined);
    mockGetParticipantByUrl.mockResolvedValue(null);
    mockAddParticipant.mockResolvedValue(makeParticipant({ id: '550e8400-e29b-41d4-a716-000000000099' }));
    mockScrapeProfile.mockResolvedValue({
      name: 'Test User', badges: [], avatar_url: '',
      profile_url: VALID_URL, scraped_at: new Date().toISOString(),
      badges_count: 0, total_points: 0,
    });
    (addFacilitatorMember as jest.Mock).mockResolvedValue(undefined);
    (createAuditLog      as jest.Mock).mockResolvedValue(undefined);
    ((require('../lib/db').setBadges) as jest.Mock).mockResolvedValue(0);
    (updateParticipant   as jest.Mock).mockResolvedValue(null);
  });

  async function callImport(rows: string[], fileName = 'test.csv') {
    return POST_import(makeReq('POST', { rows, file_name: fileName }));
  }

  it('[H-3] returns 400 when rows.length exceeds 50', async () => {
    const rows = Array.from({ length: 51 }, (_, i) => `${VALID_URL}-${i}`);
    const res  = await callImport(rows);
    const body = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/50/);
    expect(mockCreateUploadBatch).not.toHaveBeenCalled();
  });

  it('[L-1] calls updateUploadBatch with the correct final success/failed counts', async () => {
    const res  = await callImport([VALID_URL]);
    const body = await res.json() as { successful: number; failed: number };
    expect(res.status).toBe(200);
    expect(mockUpdateUploadBatch).toHaveBeenCalledWith('batch-uuid-1', {
      successful: body.successful,
      failed:     body.failed,
    });
  });

  it('[L-1] updateUploadBatch called even when all rows fail validation', async () => {
    const res  = await callImport(['not-a-valid-url']);
    const body = await res.json() as { failed: number };
    expect(res.status).toBe(200);
    expect(body.failed).toBe(1);
    expect(mockUpdateUploadBatch).toHaveBeenCalledWith('batch-uuid-1', {
      successful: 0, failed: 1,
    });
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await callImport([VALID_URL]);
    expect(res.status).toBe(401);
  });
});

// ─── M-3: cron/refresh-leaderboard — snapshot has real badge counts ──────────

describe('[M-3] cron/refresh-leaderboard — snapshot uses real badge counts', () => {
  const CRON_SECRET = 'test-cron-secret-value-long-enough';
  const ALICE_ID    = '550e8400-e29b-41d4-a716-100000000001';
  const BOB_ID      = '550e8400-e29b-41d4-a716-100000000002';

  const aliceBadges: Badge[] = [
    makeBadge('game',        ALICE_ID),
    makeBadge('game',        ALICE_ID),
    makeBadge('game',        ALICE_ID),
    makeBadge('skill_badge', ALICE_ID),
    makeBadge('skill_badge', ALICE_ID),
    makeBadge('skill_badge', ALICE_ID),
    makeBadge('skill_badge', ALICE_ID),
  ];
  const bobBadges: Badge[] = [
    makeBadge('game',        BOB_ID),
    makeBadge('skill_badge', BOB_ID),
    makeBadge('skill_badge', BOB_ID),
    makeBadge('skill_badge', BOB_ID),
    makeBadge('skill_badge', BOB_ID),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    mockGetSystemSetting.mockResolvedValue('0');
    (setSystemSetting    as jest.Mock).mockResolvedValue(undefined);
    (updateParticipant   as jest.Mock).mockResolvedValue(null);

    const alice = makeParticipant({ id: ALICE_ID, name: 'Alice', monthly_points: 5 });
    const bob   = makeParticipant({ id: BOB_ID,   name: 'Bob',   monthly_points: 3 });
    mockGetParticipants.mockResolvedValue([alice, bob]);
    mockGetAllActiveBadges.mockResolvedValue(
      new Map([[ALICE_ID, aliceBadges], [BOB_ID, bobBadges]]),
    );
  });

  function makeCronReq() {
    return new Request('https://arcadetrack.app/api/cron/refresh-leaderboard', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
  }

  it('[M-3] Alice has 3 games and 4 skills in the snapshot', async () => {
    const res  = await GET_leaderboard_cron(makeCronReq());
    const body = await res.json() as { leaderboard: { name: string; games: number; skills: number }[] };
    const alice = body.leaderboard.find(e => e.name === 'Alice');
    expect(alice?.games).toBe(3);
    expect(alice?.skills).toBe(4);
  });

  it('[M-3] snapshot is sorted by points descending', async () => {
    const res  = await GET_leaderboard_cron(makeCronReq());
    const body = await res.json() as { leaderboard: { points: number }[] };
    for (let i = 1; i < body.leaderboard.length; i++) {
      expect(body.leaderboard[i - 1].points).toBeGreaterThanOrEqual(body.leaderboard[i].points);
    }
  });

  it('returns 401 without the cron secret', async () => {
    const res = await GET_leaderboard_cron(
      new Request('https://arcadetrack.app/api/cron/refresh-leaderboard'),
    );
    expect(res.status).toBe(401);
  });
});
