/** The earliest date a badge must be earned to count toward the active-period score. */
export const ACTIVE_PERIOD_START = '2026-07-01' as const;

/** Points awarded per completed game badge. */
export const GAME_BADGE_POINTS = 1.0 as const;

/** Points awarded per completed skill badge. */
export const SKILL_BADGE_POINTS = 0.5 as const;

export function calcArcadePoints(games: number, skills: number): number {
  return games * GAME_BADGE_POINTS + skills * SKILL_BADGE_POINTS;
}

export function calcPointsFromBadges(
  badges: ReadonlyArray<{ category: string; earned_date: string }>,
  activeSince: string = ACTIVE_PERIOD_START,
): number {
  const active = badges.filter(b => b.earned_date >= activeSince);
  const games  = active.filter(b => b.category === 'game').length;
  const skills = active.filter(b => b.category === 'skill_badge').length;
  return calcArcadePoints(games, skills);
}
