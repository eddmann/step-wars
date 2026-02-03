import type { Env } from "../../types";
import type {
  LeaderboardRepository,
  LeaderboardRow,
  DailyStepsRow,
  WinnerRow,
} from "../interfaces/leaderboard.repository";

export function createD1LeaderboardRepository(env: Env): LeaderboardRepository {
  return {
    async getChallengeLeaderboard(
      challengeId: number,
      challengeStartDate: string,
      challengeEndDate: string,
      today: string,
      editCutoffDate: string,
    ): Promise<LeaderboardRow[]> {
      const result = await env.DB.prepare(
        `SELECT
           u.id as user_id,
           u.name,
           COALESCE((
             SELECT SUM(step_count) FROM step_entries
             WHERE user_id = u.id
               AND date >= ? AND date <= ?
               AND date < ?
           ), 0) as confirmed_steps,
           COALESCE((
             SELECT SUM(step_count) FROM step_entries
             WHERE user_id = u.id
               AND date >= ? AND date <= ?
               AND date >= ?
           ), 0) as pending_steps,
           COALESCE((SELECT SUM(points) FROM daily_points WHERE challenge_id = ? AND user_id = u.id), 0) as total_points,
           COALESCE((SELECT step_count FROM step_entries WHERE user_id = u.id AND date = ?), 0) as today_steps
         FROM challenge_participants cp
         INNER JOIN users u ON cp.user_id = u.id
         WHERE cp.challenge_id = ?
         GROUP BY u.id, u.name
         ORDER BY confirmed_steps DESC`,
      )
        .bind(
          challengeStartDate,
          challengeEndDate,
          editCutoffDate,
          challengeStartDate,
          challengeEndDate,
          editCutoffDate,
          challengeId,
          today,
          challengeId,
        )
        .all<LeaderboardRow>();
      return result.results;
    },

    async getLastFinalizedSteps(
      challengeId: number,
      date: string,
    ): Promise<{ user_id: number; steps: number }[]> {
      const result = await env.DB.prepare(
        `SELECT cp.user_id, COALESCE(se.step_count, 0) as steps
         FROM challenge_participants cp
         LEFT JOIN step_entries se ON se.user_id = cp.user_id AND se.date = ?
         WHERE cp.challenge_id = ?`,
      )
        .bind(date, challengeId)
        .all<{ user_id: number; steps: number }>();
      return result.results;
    },

    async getDailyStepsForChallenge(
      challengeId: number,
      date: string,
    ): Promise<DailyStepsRow[]> {
      const result = await env.DB.prepare(
        `SELECT se.user_id, u.name, COALESCE(se.step_count, 0) as steps
         FROM challenge_participants cp
         INNER JOIN users u ON cp.user_id = u.id
         LEFT JOIN step_entries se ON se.user_id = cp.user_id AND se.date = ?
         WHERE cp.challenge_id = ?
         ORDER BY steps DESC`,
      )
        .bind(date, challengeId)
        .all<DailyStepsRow>();
      return result.results;
    },

    async getCumulativeWinner(
      challengeId: number,
      startDate: string,
      endDate: string,
    ): Promise<WinnerRow | null> {
      const result = await env.DB.prepare(
        `SELECT cp.user_id, u.name, COALESCE(SUM(se.step_count), 0) as score
         FROM challenge_participants cp
         INNER JOIN users u ON cp.user_id = u.id
         LEFT JOIN step_entries se ON se.user_id = cp.user_id
           AND se.date >= ? AND se.date <= ?
         WHERE cp.challenge_id = ?
         GROUP BY cp.user_id, u.name
         ORDER BY score DESC
         LIMIT 1`,
      )
        .bind(startDate, endDate, challengeId)
        .first<WinnerRow>();
      return result ?? null;
    },

    async getPointsWinner(challengeId: number): Promise<WinnerRow | null> {
      const result = await env.DB.prepare(
        `SELECT cp.user_id, u.name, COALESCE(SUM(dp.points), 0) as score
         FROM challenge_participants cp
         INNER JOIN users u ON cp.user_id = u.id
         LEFT JOIN daily_points dp ON dp.user_id = cp.user_id AND dp.challenge_id = ?
         WHERE cp.challenge_id = ?
         GROUP BY cp.user_id, u.name
         ORDER BY score DESC
         LIMIT 1`,
      )
        .bind(challengeId, challengeId)
        .first<WinnerRow>();
      return result ?? null;
    },
  };
}
