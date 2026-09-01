'use client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreakData {
  /** Consecutive-day run ending at the most recent badge date. */
  current: number;
  /** All-time longest consecutive run within the available badge history. */
  longest: number;
  /** Most recent active date (YYYY-MM-DD). */
  lastDate: string;
  /** Epoch-ms of last computation – used to detect stale cache. */
  updatedAt: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const PREFIX = 'arcade_streak_';

/** Normalise any ISO string to a bare YYYY-MM-DD day token. */
function toDay(iso: string): string {
  return iso.slice(0, 10);
}

/** Integer number of calendar days between two YYYY-MM-DD strings. */
function daysBetween(earlier: string, later: string): number {
  const ms =
    new Date(later   + 'T00:00:00').getTime() -
    new Date(earlier + 'T00:00:00').getTime();
  return Math.round(ms / 86_400_000);
}

// ─── Core algorithm ───────────────────────────────────────────────────────────

/**
 * Compute streak from a list of raw date strings (ISO or YYYY-MM-DD).
 *
 * Rules (per task spec):
 *   • Each unique calendar day counts as one "activity day".
 *   • Consecutive days → run grows by 1.
 *   • One or more days skipped → run resets; the next activity day starts
 *     a new run of length 1 ("dimulai kembali dari hari aktivitas berikutnya").
 *   • `current` is the length of the LAST (most recent) run.
 *   • `longest`  is the maximum run ever seen in the supplied data.
 */
export function computeStreak(rawDates: string[]): Omit<StreakData, 'updatedAt'> {
  // De-duplicate and sort ascending
  const sorted = [...new Set(rawDates.map(toDay))].sort();
  if (!sorted.length) return { current: 0, longest: 0, lastDate: '' };

  let runLen  = 1;
  let longest = 1;

  for (let i = 1; i < sorted.length; i++) {
    const diff = daysBetween(sorted[i - 1], sorted[i]);
    if (diff === 1) {
      runLen++;
      if (runLen > longest) longest = runLen;
    } else {
      runLen = 1; // gap detected – restart the run
    }
  }

  return {
    current:  runLen,                          // length of the most recent run
    longest,
    lastDate: sorted[sorted.length - 1],
  };
}

// ─── localStorage persistence ─────────────────────────────────────────────────

/**
 * Persist streak data for a given participant.
 * Keyed per-user so different accounts on the same browser stay isolated.
 */
export function saveStreakData(participantId: string, data: StreakData): void {
  try {
    localStorage.setItem(PREFIX + participantId, JSON.stringify(data));
  } catch { /* storage unavailable (SSR / private mode) – silently ignore */ }
}

/** Load previously saved streak data, or null if nothing is stored. */
export function loadStreakData(participantId: string): StreakData | null {
  try {
    const raw = localStorage.getItem(PREFIX + participantId);
    return raw ? (JSON.parse(raw) as StreakData) : null;
  } catch { return null; }
}
