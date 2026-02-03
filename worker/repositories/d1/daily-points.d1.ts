import type { Env } from "../../types";
import type {
  DailyPointsRepository,
  DailyPointsRow,
} from "../interfaces/daily-points.repository";

export function createD1DailyPointsRepository(env: Env): DailyPointsRepository {
  return {
    async hasPointsForDate(
      challengeId: number,
      date: string,
    ): Promise<boolean> {
      const existing = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM daily_points WHERE challenge_id = ? AND date = ?`,
      )
        .bind(challengeId, date)
        .first<{ count: number }>();
      return (existing?.count ?? 0) > 0;
    },

    async listForDate(
      challengeId: number,
      date: string,
    ): Promise<DailyPointsRow[]> {
      const result = await env.DB.prepare(
        `SELECT user_id, points FROM daily_points
         WHERE challenge_id = ? AND date = ?`,
      )
        .bind(challengeId, date)
        .all<DailyPointsRow>();
      return result.results;
    },

    async upsert(
      challengeId: number,
      userId: number,
      date: string,
      points: number,
    ): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO daily_points (challenge_id, user_id, date, points)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(challenge_id, user_id, date) DO UPDATE SET points = excluded.points`,
      )
        .bind(challengeId, userId, date, points)
        .run();
    },

    async getTotalPointsForChallenge(
      challengeId: number,
    ): Promise<{ user_id: number; name: string; score: number } | null> {
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
        .first<{ user_id: number; name: string; score: number }>();
      return result ?? null;
    },
  };
}
