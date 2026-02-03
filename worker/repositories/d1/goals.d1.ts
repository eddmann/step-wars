import type { Env, UserGoals } from "../../types";
import type { GoalsRepository } from "../interfaces/goals.repository";

export function createD1GoalsRepository(env: Env): GoalsRepository {
  return {
    async getOrCreate(userId: number): Promise<UserGoals> {
      let goals = await env.DB.prepare(
        "SELECT * FROM user_goals WHERE user_id = ?",
      )
        .bind(userId)
        .first<UserGoals>();

      if (!goals) {
        goals = await env.DB.prepare(
          `INSERT INTO user_goals (user_id) VALUES (?) RETURNING *`,
        )
          .bind(userId)
          .first<UserGoals>();
      }

      return goals!;
    },

    async update(
      userId: number,
      dailyTarget: number,
      weeklyTarget: number,
    ): Promise<UserGoals> {
      const result = await env.DB.prepare(
        `UPDATE user_goals
         SET daily_target = ?, weekly_target = ?, updated_at = datetime('now')
         WHERE user_id = ?
         RETURNING *`,
      )
        .bind(dailyTarget, weeklyTarget, userId)
        .first<UserGoals>();
      return result!;
    },

    async togglePause(userId: number, isPaused: boolean): Promise<UserGoals> {
      const result = await env.DB.prepare(
        `UPDATE user_goals
         SET is_paused = ?, paused_at = ?, updated_at = datetime('now')
         WHERE user_id = ?
         RETURNING *`,
      )
        .bind(
          isPaused ? 1 : 0,
          isPaused ? new Date().toISOString() : null,
          userId,
        )
        .first<UserGoals>();
      return result!;
    },

    async updateStreak(
      userId: number,
      currentStreak: number,
      longestStreak: number,
      lastAchievedDate: string | null,
    ): Promise<void> {
      await env.DB.prepare(
        `UPDATE user_goals
         SET current_streak = ?, longest_streak = ?, last_achieved_date = ?, updated_at = datetime('now')
         WHERE user_id = ?`,
      )
        .bind(currentStreak, longestStreak, lastAchievedDate, userId)
        .run();
    },
  };
}
