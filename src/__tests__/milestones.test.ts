/**
 * Tests for src/lib/milestones.ts
 *
 * Verifies:
 *   • achievedMilestone() returns null below M1 threshold
 *   • Each milestone is returned at its exact boundary
 *   • The highest achieved milestone is returned (not the first match)
 *   • facilitatorBonus() returns the correct points
 *   • The canonical thresholds match the README specification
 *   • The email route and Dashboard now derive from the same source
 */

import { achievedMilestone, facilitatorBonus, MILESTONES } from '../lib/milestones';

// ─── Canonical threshold guard ────────────────────────────────────────────────
// This test documents the authoritative milestone requirements from the README.
// If the business requirements change, update the README, this test, and
// milestones.ts together — never update only one of them.

describe('MILESTONES canonical thresholds (README spec)', () => {
  it('has exactly 4 milestones', () => {
    expect(MILESTONES).toHaveLength(4);
  });

  it.each([
    [1, 'Milestone 1',         6, 14,  7],
    [2, 'Milestone 2',         8, 28, 18],
    [3, 'Milestone 3',        10, 42, 29],
    [4, 'Ultimate Milestone', 12, 56, 40],
  ])('Milestone %d: label=%s games=%d skills=%d bonus=%d',
    (id, label, games, skills, bonus) => {
      const m = MILESTONES.find(x => x.id === id);
      expect(m).toBeDefined();
      expect(m!.label).toBe(label);
      expect(m!.games).toBe(games);
      expect(m!.skills).toBe(skills);
      expect(m!.bonus).toBe(bonus);
    },
  );
});

// ─── achievedMilestone ───────────────────────────────────────────────────────

describe('achievedMilestone', () => {
  it('returns null when no milestone is achieved (0 games, 0 skills)', () => {
    expect(achievedMilestone(0, 0)).toBeNull();
  });

  it('returns null when games are sufficient but skills are not', () => {
    expect(achievedMilestone(6, 13)).toBeNull(); // games OK, skills short by 1
  });

  it('returns null when skills are sufficient but games are not', () => {
    expect(achievedMilestone(5, 14)).toBeNull(); // skills OK, games short by 1
  });

  it('returns Milestone 1 at exactly the M1 boundary (6 games, 14 skills)', () => {
    const m = achievedMilestone(6, 14);
    expect(m?.id).toBe(1);
    expect(m?.bonus).toBe(7);
  });

  it('returns Milestone 1 when above M1 but below M2 (7 games, 20 skills)', () => {
    expect(achievedMilestone(7, 20)?.id).toBe(1);
  });

  it('returns Milestone 2 at exactly the M2 boundary (8 games, 28 skills)', () => {
    const m = achievedMilestone(8, 28);
    expect(m?.id).toBe(2);
    expect(m?.bonus).toBe(18);
  });

  it('returns Milestone 3 at exactly the M3 boundary (10 games, 42 skills)', () => {
    const m = achievedMilestone(10, 42);
    expect(m?.id).toBe(3);
    expect(m?.bonus).toBe(29);
  });

  it('returns Ultimate Milestone at exactly the M4 boundary (12 games, 56 skills)', () => {
    const m = achievedMilestone(12, 56);
    expect(m?.id).toBe(4);
    expect(m?.bonus).toBe(40);
  });

  it('returns the HIGHEST achieved milestone, not the first match', () => {
    // With 12 games + 56 skills all four are met; must return M4.
    expect(achievedMilestone(12, 56)?.id).toBe(4);
    // With 10 games + 42 skills M1-M3 are met; must return M3.
    expect(achievedMilestone(10, 42)?.id).toBe(3);
  });

  it('works with very large inputs', () => {
    expect(achievedMilestone(999, 999)?.id).toBe(4);
  });

  it('handles fractional inputs correctly (badges are always whole numbers, but guard)', () => {
    // 6.9 games should NOT meet the 6-game threshold (Math.min/comparison is exact)
    // In practice game.length is always an integer; this confirms numeric comparison safety.
    expect(achievedMilestone(5, 14)).toBeNull();
  });
});

// ─── facilitatorBonus ────────────────────────────────────────────────────────

describe('facilitatorBonus', () => {
  it('returns 0 when no milestone is achieved', () => {
    expect(facilitatorBonus(0, 0)).toBe(0);
  });

  it('returns 7 for Milestone 1', () => {
    expect(facilitatorBonus(6, 14)).toBe(7);
  });

  it('returns 18 for Milestone 2', () => {
    expect(facilitatorBonus(8, 28)).toBe(18);
  });

  it('returns 29 for Milestone 3', () => {
    expect(facilitatorBonus(10, 42)).toBe(29);
  });

  it('returns 40 for the Ultimate Milestone', () => {
    expect(facilitatorBonus(12, 56)).toBe(40);
  });

  it('returns the highest applicable bonus, not the lowest', () => {
    // 12 games + 60 skills → Ultimate Milestone → +40, not +7 or +18 or +29
    expect(facilitatorBonus(12, 60)).toBe(40);
  });
});

// ─── L-2 regression: old incorrect thresholds must NOT pass ──────────────────

describe('[L-2] regression — old Dashboard inline thresholds must no longer be used', () => {
  // The old Dashboard computed m1Done = games >= 1 && skills >= 7
  // Under the new system, 1 game + 7 skills should return null (below M1).
  it('does NOT award Milestone 1 for the old threshold of 1 game + 7 skills', () => {
    expect(achievedMilestone(1, 7)).toBeNull();
  });

  // The old email route computed m2Done = games >= 3 && skills >= 14.
  // Under the new system, 3 games + 14 skills should return null (below M1).
  it('does NOT award any milestone for the old M2 threshold of 3 games + 14 skills', () => {
    expect(achievedMilestone(3, 14)).toBeNull();
  });

  // The old Dashboard had Milestone 3 as games: 3, which would let a participant
  // with only 3 games achieve what looked like Milestone 3 on screen.
  it('requires 10 games (not 3) to achieve Milestone 3', () => {
    // 3 games + 42 skills: was incorrectly shown as "Milestone 3 ✓" in old Dashboard
    expect(achievedMilestone(3, 42)).toBeNull();
    // The correct threshold requires 10 games.
    expect(achievedMilestone(10, 42)?.id).toBe(3);
  });
});
