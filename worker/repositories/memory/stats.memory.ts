import type {
  StatsRepository,
  UserStats,
} from "../interfaces/stats.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryStatsRepository(store: TestStore): StatsRepository {
  return {
    async getUserStats(userId: number): Promise<UserStats> {
      const totalSteps = store.stepEntries
        .filter((e) => e.user_id === userId)
        .reduce((sum, e) => sum + e.step_count, 0);

      const challengesJoined = store.participants.filter(
        (p) => p.user_id === userId,
      ).length;
      const challengesWon = store.userBadges.filter(
        (b) => b.user_id === userId && b.badge_type === "challenge_winner",
      ).length;
      const badgesEarned = store.userBadges.filter(
        (b) => b.user_id === userId,
      ).length;

      return {
        total_steps: totalSteps,
        challenges_joined: challengesJoined,
        challenges_won: challengesWon,
        badges_earned: badgesEarned,
      };
    },
  };
}
