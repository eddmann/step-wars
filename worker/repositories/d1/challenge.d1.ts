import type { Env, Challenge } from "../../types";
import type {
  ChallengeRepository,
  CreateChallengeInput,
} from "../interfaces/challenge.repository";

export function createD1ChallengeRepository(env: Env): ChallengeRepository {
  return {
    async create(input: CreateChallengeInput): Promise<Challenge> {
      if (input.status) {
        const result = await env.DB.prepare(
          `INSERT INTO challenges (title, description, creator_id, start_date, end_date, mode, invite_code, timezone, is_recurring, recurring_interval, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING *`,
        )
          .bind(
            input.title,
            input.description,
            input.creatorId,
            input.startDate,
            input.endDate,
            input.mode,
            input.inviteCode,
            input.timezone,
            input.isRecurring ? 1 : 0,
            input.recurringInterval,
            input.status,
          )
          .first<Challenge>();
        return result!;
      }

      const result = await env.DB.prepare(
        `INSERT INTO challenges (title, description, creator_id, start_date, end_date, mode, invite_code, timezone, is_recurring, recurring_interval)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
      )
        .bind(
          input.title,
          input.description,
          input.creatorId,
          input.startDate,
          input.endDate,
          input.mode,
          input.inviteCode,
          input.timezone,
          input.isRecurring ? 1 : 0,
          input.recurringInterval,
        )
        .first<Challenge>();

      return result!;
    },

    async getById(id: number): Promise<Challenge | null> {
      return await env.DB.prepare("SELECT * FROM challenges WHERE id = ?")
        .bind(id)
        .first<Challenge>();
    },

    async getByInviteCode(inviteCode: string): Promise<Challenge | null> {
      return await env.DB.prepare(
        "SELECT * FROM challenges WHERE invite_code = ?",
      )
        .bind(inviteCode.toUpperCase())
        .first<Challenge>();
    },

    async listForUser(
      userId: number,
    ): Promise<(Challenge & { participant_count: number })[]> {
      const result = await env.DB.prepare(
        `SELECT c.*,
                (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participant_count
         FROM challenges c
         INNER JOIN challenge_participants cp ON c.id = cp.challenge_id
         WHERE cp.user_id = ?
         ORDER BY c.start_date DESC`,
      )
        .bind(userId)
        .all<Challenge & { participant_count: number }>();
      return result.results;
    },

    async listByStatus(status: Challenge["status"]): Promise<Challenge[]> {
      const result = await env.DB.prepare(
        "SELECT * FROM challenges WHERE status = ?",
      )
        .bind(status)
        .all<Challenge>();
      return result.results;
    },

    async listActiveByMode(mode: Challenge["mode"]): Promise<Challenge[]> {
      const result = await env.DB.prepare(
        `SELECT * FROM challenges WHERE mode = ? AND status = 'active'`,
      )
        .bind(mode)
        .all<Challenge>();
      return result.results;
    },

    async updateStatus(id: number, status: Challenge["status"]): Promise<void> {
      await env.DB.prepare(
        `UPDATE challenges SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(status, id)
        .run();
    },
  };
}
