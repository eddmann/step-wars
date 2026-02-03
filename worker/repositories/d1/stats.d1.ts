import type { Env } from "../../types";
import type {
  StatsRepository,
  UserStats,
} from "../interfaces/stats.repository";

export function createD1StatsRepository(env: Env): StatsRepository {
  return {
    async getUserStats(userId: number): Promise<UserStats> {
      const result = await env.DB.prepare(
        `SELECT
           COALESCE((SELECT SUM(step_count) FROM step_entries WHERE user_id = ?), 0) as total_steps,
           (SELECT COUNT(*) FROM challenge_participants WHERE user_id = ?) as challenges_joined,
           (SELECT COUNT(*) FROM user_badges WHERE user_id = ? AND badge_type = 'challenge_winner') as challenges_won,
           (SELECT COUNT(*) FROM user_badges WHERE user_id = ?) as badges_earned`,
      )
        .bind(userId, userId, userId, userId)
        .first<UserStats>();
      return result!;
    },
  };
}
