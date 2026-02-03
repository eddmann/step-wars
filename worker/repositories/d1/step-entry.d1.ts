import type { Env, StepEntry } from "../../types";
import type { StepEntryRepository } from "../interfaces/step-entry.repository";

export function createD1StepEntryRepository(env: Env): StepEntryRepository {
  return {
    async getByUserAndDate(
      userId: number,
      date: string,
    ): Promise<StepEntry | null> {
      return await env.DB.prepare(
        `SELECT * FROM step_entries WHERE user_id = ? AND date = ?`,
      )
        .bind(userId, date)
        .first<StepEntry>();
    },

    async upsert(
      userId: number,
      date: string,
      stepCount: number,
      source: string = "manual",
    ): Promise<StepEntry> {
      const result = await env.DB.prepare(
        `INSERT INTO step_entries (user_id, date, step_count, source)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, date)
         DO UPDATE SET step_count = excluded.step_count, source = excluded.source, updated_at = datetime('now')
         RETURNING *`,
      )
        .bind(userId, date, stepCount, source)
        .first<StepEntry>();
      return result!;
    },

    async listForUser(userId: number): Promise<StepEntry[]> {
      const result = await env.DB.prepare(
        `SELECT * FROM step_entries WHERE user_id = ? ORDER BY date DESC`,
      )
        .bind(userId)
        .all<StepEntry>();
      return result.results;
    },

    async listRecentForUser(
      userId: number,
      limit: number,
    ): Promise<StepEntry[]> {
      const result = await env.DB.prepare(
        `SELECT * FROM step_entries WHERE user_id = ? ORDER BY date DESC LIMIT ?`,
      )
        .bind(userId, limit)
        .all<StepEntry>();
      return result.results;
    },

    async getStepsForDate(userId: number, date: string): Promise<number> {
      const result = await env.DB.prepare(
        `SELECT COALESCE(step_count, 0) as total
         FROM step_entries
         WHERE user_id = ? AND date = ?`,
      )
        .bind(userId, date)
        .first<{ total: number }>();
      return result?.total || 0;
    },

    async sumForUserBetweenDates(
      userId: number,
      startDate: string,
      endDate: string,
    ): Promise<number> {
      const result = await env.DB.prepare(
        `SELECT COALESCE(SUM(step_count), 0) as total
         FROM step_entries
         WHERE user_id = ? AND date >= ? AND date <= ?`,
      )
        .bind(userId, startDate, endDate)
        .first<{ total: number }>();
      return result?.total || 0;
    },
  };
}
