import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
let _lastErrorAt: number | null = null;
const RECONNECT_BACKOFF_MS = 30_000;

function getClient(): SupabaseClient {
  // If the client exists and no recent error occurred (or backoff has elapsed),
  // reuse it.  On first call after an error, create a fresh client so transient
  // network issues (DNS hiccups, Supabase restarts) are self-healing.
  const shouldRecreate =
    !_supabase ||
    (_lastErrorAt !== null && Date.now() - _lastErrorAt > RECONNECT_BACKOFF_MS);

  if (shouldRecreate) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing Supabase env vars. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
      );
    }
    _supabase = createClient(url, key, { auth: { persistSession: false } });
    _lastErrorAt = null;
  }

  return _supabase!;
}

/**
 * Signal that the last Supabase call failed with a connection-level error.
 * The next call to getClient() after the backoff window will recreate the
 * client instance, allowing recovery from transient network failures.
 */
export function markClientError(): void {
  _lastErrorAt = Date.now();
}

export const ACTIVE_PERIOD_START = '2026-07-01';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Participant {
  id: string;
  name: string;
  profile_url: string;
  avatar_url?: string | null;
  /**
   * Email address for progress-report emails.
   * NULL until the participant provides it through the dashboard.
   * This field must exist as a nullable column in the `participants` table.
   */
  email?: string | null;
  role: 'facilitator' | 'participant';
  last_synced?: string | null;
  created_at: string;
  monthly_points?: number;
}

export interface Badge {
  id: string;
  participant_id: string;
  badge_name: string;
  category: 'game' | 'skill_badge';
  points: number;
  earned_date: string;
  image_url?: string | null;
  scraped_at: string;
}

export interface SkillBadge {
  id: number;
  name: string;
  url: string;
  cost?: string;
  difficulty?: string;
  duration?: string;
  labs?: number;
  created_at?: string;
}

export interface Facilitator {
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface UploadBatch {
  id: string;
  fac_code: string;
  file_name: string;
  total: number;
  successful: number;
  failed: number;
  rolled_back: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target_id?: string | null;
  meta?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface FeedbackItem {
  id: string;
  message: string;
  category: string;
  rating?: number | null;
  created_at: string;
}

export interface GlobalStats {
  totalParticipants: number;
  totalBadges: number;
  totalGameBadges: number;
  totalSkillBadges: number;
  totalFacilitators: number;
}

// ─── PARTICIPANT QUERIES ───────────────────────────────────────────────────────

export async function getSkillBadges(): Promise<SkillBadge[]> {
  const { data, error } = await getClient().from('skill_badges').select('*');
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch participants ordered by monthly_points descending.
 * Pass `limit` and `offset` for pagination; omit both to fetch all rows.
 */
export async function getParticipants(
  opts: { limit?: number; offset?: number; facCode?: string } = {},
): Promise<Participant[]> {
  // If a facilitator code is supplied, only return that facilitator's members.
  if (opts.facCode) {
    const { data: links } = await getClient()
      .from('facilitator_members')
      .select('participant_id')
      .eq('facilitator_code', opts.facCode);
    const ids = (links ?? []).map((l: { participant_id: string }) => l.participant_id);
    if (!ids.length) return [];
    let q = getClient()
      .from('participants')
      .select('*')
      .in('id', ids)
      .order('monthly_points', { ascending: false });
    if (opts.limit !== undefined && opts.offset !== undefined) {
      q = q.range(opts.offset, opts.offset + opts.limit - 1);
    } else if (opts.limit !== undefined) {
      q = q.limit(opts.limit);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  let q = getClient()
    .from('participants')
    .select('*')
    .order('monthly_points', { ascending: false });

  if (opts.limit !== undefined && opts.offset !== undefined) {
    q = q.range(opts.offset, opts.offset + opts.limit - 1);
  } else if (opts.limit !== undefined) {
    q = q.limit(opts.limit);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Returns the total number of participants.
 * Used alongside getParticipants() to provide pagination metadata to callers
 * without loading every row.
 */
export async function countParticipants(
  opts: { facCode?: string } = {},
): Promise<number> {
  if (opts.facCode) {
    const { count, error } = await getClient()
      .from('facilitator_members')
      .select('*', { count: 'exact', head: true })
      .eq('facilitator_code', opts.facCode);
    if (error) throw error;
    return count ?? 0;
  }
  const { count, error } = await getClient()
    .from('participants')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getParticipant(id: string): Promise<Participant | null> {
  const { data, error } = await getClient()
    .from('participants')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getParticipantByUrl(
  profileUrl: string,
): Promise<Participant | null> {
  const { data, error } = await getClient()
    .from('participants')
    .select('*')
    .ilike('profile_url', profileUrl)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addParticipant(
  p: Pick<Participant, 'name' | 'profile_url' | 'role'>,
): Promise<Participant> {
  const { data, error } = await getClient()
    .from('participants')
    .insert({ ...p, name: p.name || 'Google Cloud Learner' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateParticipant(
  id: string,
  updates: Partial<Participant>,
): Promise<Participant | null> {
  const { data, error } = await getClient()
    .from('participants')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteParticipant(id: string): Promise<boolean> {
  const { error, count } = await getClient()
    .from('participants')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ─── BADGE QUERIES ────────────────────────────────────────────────────────────

export async function getBadges(participantId?: string): Promise<Badge[]> {
  let q = getClient().from('badges').select('*');
  if (participantId) q = q.eq('participant_id', participantId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch all badges earned on or after `since`, grouped by participant ID.
 * Issues a single SELECT to avoid N+1 per-participant queries.
 */
export async function getAllActiveBadgesGrouped(
  since: string,
): Promise<Map<string, Badge[]>> {
  const { data, error } = await getClient()
    .from('badges')
    .select('*')
    .gte('earned_date', since);
  if (error) throw error;

  const map = new Map<string, Badge[]>();
  for (const b of data ?? []) {
    const bucket = map.get(b.participant_id) ?? [];
    bucket.push(b);
    map.set(b.participant_id, bucket);
  }
  return map;
}

/**
 * Upsert current-period badges, prune stale ones, then cache arcade points
 * on the participant row so the leaderboard query needs no JOIN.
 */
export async function setBadges(
  participantId: string,
  newBadges: Omit<Badge, 'id' | 'participant_id' | 'scraped_at'>[],
): Promise<number> {
  const current = newBadges.filter(b => b.earned_date >= ACTIVE_PERIOD_START);
  const db = getClient();

  if (current.length > 0) {
    const rows = current.map(b => ({ ...b, participant_id: participantId }));
    const { error } = await db
      .from('badges')
      .upsert(rows, { onConflict: 'participant_id,badge_name' });
    if (error) throw error;
  }

  const { error: pruneErr } = await db
    .from('badges')
    .delete()
    .eq('participant_id', participantId)
    .lt('earned_date', ACTIVE_PERIOD_START);
  if (pruneErr) throw pruneErr;

  const games        = current.filter(b => b.category === 'game').length;
  const skills       = current.filter(b => b.category === 'skill_badge').length;
  const monthlyPoints = games + skills * 0.5;

  const { error: updErr } = await db
    .from('participants')
    .update({ monthly_points: monthlyPoints })
    .eq('id', participantId);
  if (updErr) throw updErr;

  return monthlyPoints;
}

// ─── FACILITATOR QUERIES ──────────────────────────────────────────────────────

export async function getFacilitatorByCode(
  code: string,
): Promise<Facilitator | null> {
  const { data, error } = await getClient()
    .from('facilitator_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createFacilitatorCode(
  name: string,
  code: string,
): Promise<Facilitator | null> {
  const { data, error } = await getClient()
    .from('facilitator_codes')
    .insert({ name, code: code.toUpperCase(), is_active: true })
    .select()
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function listFacilitatorCodes(): Promise<Facilitator[]> {
  const { data, error } = await getClient()
    .from('facilitator_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getFacilitatorMemberCount(facCode: string): Promise<number> {
  const { count, error } = await getClient()
    .from('facilitator_members')
    .select('*', { count: 'exact', head: true })
    .eq('fac_code', facCode);
  if (error) throw error;
  return count ?? 0;
}

export async function getFacilitatorMembers(
  facCode: string,
): Promise<Participant[]> {
  const { data, error } = await getClient()
    .from('facilitator_members')
    .select('participant_id')
    .eq('fac_code', facCode);
  if (error) throw error;
  if (!data?.length) return [];

  const ids = data.map(r => r.participant_id);
  const { data: participants, error: pErr } = await getClient()
    .from('participants')
    .select('*')
    .in('id', ids)
    .order('monthly_points', { ascending: false });
  if (pErr) throw pErr;
  return participants ?? [];
}

export async function addFacilitatorMember(
  facCode: string,
  participantId: string,
  source: string,
  batchId?: string | null,
): Promise<void> {
  const { error } = await getClient()
    .from('facilitator_members')
    .upsert(
      {
        fac_code:       facCode,
        participant_id: participantId,
        source,
        batch_id:       batchId ?? null,
      },
      { onConflict: 'fac_code,participant_id' },
    );
  if (error) throw error;
}

export async function removeFacilitatorMember(
  facCode: string,
  participantId: string,
): Promise<void> {
  const { error } = await getClient()
    .from('facilitator_members')
    .delete()
    .eq('fac_code', facCode)
    .eq('participant_id', participantId);
  if (error) throw error;
}

// ─── UPLOAD BATCH ─────────────────────────────────────────────────────────────

export async function createUploadBatch(
  facCode: string,
  fileName: string,
  total: number,
  successful: number,
  failed: number,
): Promise<UploadBatch | null> {
  const { data, error } = await getClient()
    .from('upload_batches')
    .insert({
      fac_code: facCode,
      file_name: fileName,
      total,
      successful,
      failed,
      rolled_back: false,
    })
    .select()
    .maybeSingle();
  if (error) return null;
  return data;
}

/**
 * Update the final successful/failed counts on an upload batch record.
 * Called at the end of the import route after the processing loop completes.
 */
export async function updateUploadBatch(
  id: string,
  updates: { successful: number; failed: number },
): Promise<void> {
  const { error } = await getClient()
    .from('upload_batches')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function getUploadBatches(facCode: string): Promise<UploadBatch[]> {
  const { data, error } = await getClient()
    .from('upload_batches')
    .select('*')
    .eq('fac_code', facCode)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Rolls back an upload batch atomically via a Supabase RPC.
 *
 * The RPC (rollback_batch) wraps the member deletion and batch status update
 * in a single database transaction, preventing partial-rollback inconsistency
 * if the server crashes between the two operations.
 *
 * SQL migration to run in Supabase Dashboard → SQL Editor:
 *
 *   CREATE OR REPLACE FUNCTION rollback_batch(p_id uuid, p_fac_code text)
 *   RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   DECLARE v_batch upload_batches%ROWTYPE;
 *   BEGIN
 *     SELECT * INTO v_batch FROM upload_batches
 *       WHERE id = p_id AND fac_code = p_fac_code FOR UPDATE;
 *     IF NOT FOUND OR v_batch.rolled_back THEN RETURN false; END IF;
 *     DELETE FROM facilitator_members
 *       WHERE fac_code = p_fac_code AND batch_id = p_id;
 *     UPDATE upload_batches SET rolled_back = true WHERE id = p_id;
 *     RETURN true;
 *   END;
 *   $$;
 *
 * If the RPC is not yet deployed, this function falls back to the previous
 * two-step approach (with the existing non-atomic caveat documented below).
 */
export async function rollbackBatch(
  id: string,
  facCode: string,
): Promise<boolean> {
  // Try the atomic RPC first.
  const { data: rpcData, error: rpcErr } = await getClient()
    .rpc('rollback_batch', { p_id: id, p_fac_code: facCode });

  if (!rpcErr) {
    return rpcData as boolean;
  }

  // RPC not yet deployed — fall back to the two-step approach.
  // NOTE: if the process crashes between the delete and the update the batch
  // will show rolled_back=false even though members were removed.  Deploy the
  // rollback_batch SQL function above to eliminate this window.
  const { data: batch, error: bErr } = await getClient()
    .from('upload_batches')
    .select('*')
    .eq('id', id)
    .eq('fac_code', facCode)
    .maybeSingle();
  if (bErr || !batch || batch.rolled_back) return false;

  const { data: members } = await getClient()
    .from('facilitator_members')
    .select('participant_id')
    .eq('fac_code', facCode)
    .eq('batch_id', id);

  if (members?.length) {
    await getClient()
      .from('facilitator_members')
      .delete()
      .eq('fac_code', facCode)
      .eq('batch_id', id);
  }

  await getClient()
    .from('upload_batches')
    .update({ rolled_back: true })
    .eq('id', id);

  return true;
}

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────

export async function createAuditLog(
  actor: string,
  action: string,
  targetId?: string,
  metadata?: object,
): Promise<void> {
  await getClient()
    .from('audit_logs')
    .insert({ actor, action, target_id: targetId ?? null, metadata: metadata ?? null });
}

export async function getAuditLogs(
  limit = 50,
  offset = 0,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await getClient()
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}

// ─── SYSTEM SETTINGS ─────────────────────────────────────────────────────────

export async function getSystemSetting(key: string): Promise<string | null> {
  const { data, error } = await getClient()
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) return null;
  return data?.value ?? null;
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  await getClient()
    .from('system_settings')
    .upsert({ key, value }, { onConflict: 'key' });
}

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────

export async function createFeedback(
  message: string,
  rating: number | null,
  category: string,
): Promise<void> {
  const { error } = await getClient()
    .from('feedback')
    .insert({ message, rating, category });
  if (error) throw error;
}

export async function getFeedbackList(limit = 50): Promise<FeedbackItem[]> {
  const { data, error } = await getClient()
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── GLOBAL STATS ─────────────────────────────────────────────────────────────

export async function getGlobalStats(): Promise<GlobalStats> {
  const db = getClient();
  const [partRes, badgeRes, gameRes, skillRes, facRes] = await Promise.all([
    db.from('participants').select('*',          { count: 'exact', head: true }),
    db.from('badges').select('*',               { count: 'exact', head: true }),
    db.from('badges').select('*',               { count: 'exact', head: true }).eq('category', 'game'),
    db.from('badges').select('*',               { count: 'exact', head: true }).eq('category', 'skill_badge'),
    db.from('facilitator_codes').select('*',    { count: 'exact', head: true }).eq('is_active', true),
  ]);
  return {
    totalParticipants: partRes.count  ?? 0,
    totalBadges:       badgeRes.count ?? 0,
    totalGameBadges:   gameRes.count  ?? 0,
    totalSkillBadges:  skillRes.count ?? 0,
    totalFacilitators: facRes.count   ?? 0,
  };
}
