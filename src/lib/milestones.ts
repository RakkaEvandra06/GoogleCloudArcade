export interface MilestoneDefinition {
  /** 1-based milestone index. */
  readonly id: number;
  /** Human-readable label shown in the UI and in emails. */
  readonly label: string;
  /** Minimum number of *game* badges required to achieve this milestone. */
  readonly games: number;
  /** Minimum number of *skill* badges required to achieve this milestone. */
  readonly skills: number;
  /** Facilitator bonus points awarded when this milestone is achieved. */
  readonly bonus: number;
}

/**
 * Ordered from easiest (M1) to hardest (Ultimate Milestone).
 * The array is `as const` so TypeScript infers the literal types.
 */
export const MILESTONES: readonly MilestoneDefinition[] = [
  { id: 1, label: 'Milestone 1',        games:  6, skills: 14, bonus:  7 },
  { id: 2, label: 'Milestone 2',        games:  8, skills: 28, bonus: 18 },
  { id: 3, label: 'Milestone 3',        games: 10, skills: 42, bonus: 29 },
  { id: 4, label: 'Ultimate Milestone', games: 12, skills: 56, bonus: 40 },
] as const;

export function achievedMilestone(
  games: number,
  skills: number,
): MilestoneDefinition | null {
  // Iterate from hardest to easiest and return the first one the learner meets.
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    const m = MILESTONES[i];
    if (games >= m.games && skills >= m.skills) return m;
  }
  return null;
}

/**
 * Returns the facilitator bonus points earned for a given game + skill count.
 * Returns 0 if no milestone is achieved.
 */
export function facilitatorBonus(games: number, skills: number): number {
  return achievedMilestone(games, skills)?.bonus ?? 0;
}
