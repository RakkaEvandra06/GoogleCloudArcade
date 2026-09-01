const PLAYER_KEY = 'arcade_player_auth';
const FAC_KEY    = 'arcade_fac_auth';
const ADMIN_KEY  = 'arcade_admin_auth';
const TTL_MS     = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PlayerAuth { url: string; name?: string; savedAt: number; }
export interface FacAuth    { code: string; name?: string; savedAt: number; }
export interface AdminAuth  { secret: string; savedAt: number; }

function isExpired(savedAt: number): boolean {
  return Date.now() - savedAt > TTL_MS;
}

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as T & { savedAt: number };
    if (isExpired(data.savedAt)) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function safeSet(key: string, value: object): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function safeClear(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}

/* ── Player ─────────────────────────────────────────────── */
export function savePlayerAuth(url: string, name?: string): void {
  safeSet(PLAYER_KEY, { url, name, savedAt: Date.now() });
}
export function loadPlayerAuth(): PlayerAuth | null {
  return safeGet<PlayerAuth>(PLAYER_KEY);
}
export function clearPlayerAuth(): void {
  safeClear(PLAYER_KEY);
}
export function touchPlayerAuth(): void {
  const data = loadPlayerAuth();
  if (data) safeSet(PLAYER_KEY, { ...data, savedAt: Date.now() });
}

/* ── Facilitator ────────────────────────────────────────── */
export function saveFacAuth(code: string, name?: string): void {
  safeSet(FAC_KEY, { code, name, savedAt: Date.now() });
}
export function loadFacAuth(): FacAuth | null {
  return safeGet<FacAuth>(FAC_KEY);
}
export function clearFacAuth(): void {
  safeClear(FAC_KEY);
}

/* ── Admin ──────────────────────────────────────────────── */
export function saveAdminAuth(secret: string): void {
  safeSet(ADMIN_KEY, { secret, savedAt: Date.now() });
}
export function loadAdminAuth(): AdminAuth | null {
  return safeGet<AdminAuth>(ADMIN_KEY);
}
export function clearAdminAuth(): void {
  safeClear(ADMIN_KEY);
}

/* ── Housekeeping ───────────────────────────────────────── */
export function pruneExpiredAuth(): void {
  [PLAYER_KEY, FAC_KEY, ADMIN_KEY].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const { savedAt } = JSON.parse(raw) as { savedAt: number };
      if (isExpired(savedAt)) localStorage.removeItem(key);
    } catch { localStorage.removeItem(key); }
  });
}

/** Time remaining until expiry, in a human-readable form. */
export function authExpiresIn(savedAt: number): string {
  const ms   = TTL_MS - (Date.now() - savedAt);
  if (ms <= 0) return 'expired';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d`;
  const hrs  = Math.floor(ms / (60 * 60 * 1000));
  return `${hrs}h`;
}
